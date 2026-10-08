package com.flowspace.service;

import java.util.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.dto.retrospective.*;
import com.flowspace.entity.*;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.*;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RetrospectiveService {

    private final RetrospectiveRepository retrospectiveRepository;
    private final RetrospectiveStatusSnapshotRepository statusSnapshotRepository;
    private final TaskSnapshotRepository taskSnapshotRepository;
    private final TaskSnapshotAssigneeRepository taskSnapshotAssigneeRepository;
    private final SubTaskSnapshotRepository subTaskSnapshotRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final PageService pageService;
    private final SprintRepository sprintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final BlockRepository blockRepository;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // 회고 단건 조회
    public RetrospectiveResponse getRetrospective(Long retrospectiveId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Retrospective retrospective = retrospectiveRepository.findById(retrospectiveId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.RETROSPECTIVE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(retrospective.getSprint().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<RetrospectiveStatusSnapshot> statuses = statusSnapshotRepository
            .findByRetrospectiveOrderByPositionAsc(retrospective);

        List<TaskSnapshot> snapshots = taskSnapshotRepository
            .findByRetrospectiveOrderBySnapshotStatus_PositionAscPositionAsc(retrospective);

        Map<Long, List<TaskSnapshotAssignee>> assigneesBySnapshot = groupAssignees(snapshots);

        RetrospectiveSummary summary = createSummary(snapshots, assigneesBySnapshot);

        PageDetailResponse page = pageService.getPageDetail(retrospective.getPage().getPageId(), email);

        // 하위 작업은 스냅샷마다 따로 읽지 않고 한 번에 읽어서 나눠 담아요.
        Map<Long, List<SubTaskSnapshot>> subtasksBySnapshot = new HashMap<>();

        if (!snapshots.isEmpty()) {
            for (SubTaskSnapshot subtask : subTaskSnapshotRepository.findBySnapshotInOrderByPositionAsc(snapshots)) {
                subtasksBySnapshot.computeIfAbsent(subtask.getSnapshot().getSnapshotId(), key -> new ArrayList<>())
                    .add(subtask);
            }
        }

        List<TaskSnapshotItem> taskItems = snapshots.stream()
            .map(snapshot -> TaskSnapshotItem.from(snapshot,
                assigneesBySnapshot.getOrDefault(snapshot.getSnapshotId(), List.of()),
                subtasksBySnapshot.getOrDefault(snapshot.getSnapshotId(), List.of())))
            .toList();

        return RetrospectiveResponse.from(retrospective, summary,
            statuses.stream().map(StatusSnapshotItem::from).toList(), taskItems, page);
    }

    // 워크스페이스 회고 목록 조회 (회고가 아직 없는 스프린트도 함께 반환)
    public List<RetrospectiveListItem> getRetrospectives(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<Sprint> sprints = sprintRepository.findByWorkspaceOrderByStartDateDesc(workspace);

        if (sprints.isEmpty()) {
            return List.of();
        }

        // 스프린트마다 따로 읽지 않고 회고·스냅샷·담당자·TODO 블록을 각각 한 번에 읽어요.
        Map<Long, Retrospective> retrospectiveBySprint = new HashMap<>();

        for (Retrospective retrospective : retrospectiveRepository.findWithPageBySprintIn(sprints)) {
            retrospectiveBySprint.put(retrospective.getSprint().getSprintId(), retrospective);
        }

        List<TaskSnapshot> allSnapshots = retrospectiveBySprint.isEmpty()
            ? List.of()
            : taskSnapshotRepository.findByRetrospectiveInOrderBySnapshotStatus_PositionAscPositionAsc(
                retrospectiveBySprint.values());

        Map<Long, List<TaskSnapshot>> snapshotsByRetrospective = new HashMap<>();

        for (TaskSnapshot snapshot : allSnapshots) {
            snapshotsByRetrospective.computeIfAbsent(snapshot.getRetrospective().getRetrospectiveId(),
                key -> new ArrayList<>()).add(snapshot);
        }

        Map<Long, List<TaskSnapshotAssignee>> assigneesBySnapshot = groupAssignees(allSnapshots);

        Map<Long, Integer> actionItemsByPage = countActionItemsByPage(
            retrospectiveBySprint.values().stream().map(Retrospective::getPage).toList());

        return sprints.stream().map(sprint -> {

            Retrospective retrospective = retrospectiveBySprint.get(sprint.getSprintId());

            if (retrospective == null) {
                return RetrospectiveListItem.withoutRetrospective(sprint);
            }

            List<TaskSnapshot> snapshots = snapshotsByRetrospective
                .getOrDefault(retrospective.getRetrospectiveId(), List.of());

            return RetrospectiveListItem.of(sprint, retrospective, createSummary(snapshots, assigneesBySnapshot),
                actionItemsByPage.getOrDefault(retrospective.getPage().getPageId(), 0));
        }).toList();
    }

    // 스냅샷들의 담당자를 한 번에 읽어서 스냅샷 id별로 나눠 담아요.
    private Map<Long, List<TaskSnapshotAssignee>> groupAssignees(List<TaskSnapshot> snapshots) {

        Map<Long, List<TaskSnapshotAssignee>> result = new HashMap<>();

        if (snapshots.isEmpty()) {
            return result;
        }

        for (TaskSnapshotAssignee assignee : taskSnapshotAssigneeRepository
            .findBySnapshotInOrderBySnapshotAssigneeIdAsc(snapshots)) {
            result.computeIfAbsent(assignee.getSnapshot().getSnapshotId(), key -> new ArrayList<>()).add(assignee);
        }

        return result;
    }

    // 회고 페이지들의 미완료 TODO 블록 수 (Action Item), 페이지 id별로
    private Map<Long, Integer> countActionItemsByPage(Collection<Page> pages) {

        Map<Long, Integer> result = new HashMap<>();

        if (pages.isEmpty()) {
            return result;
        }

        for (Block block : blockRepository.findByPageInAndType(pages, BlockType.TODO)) {

            if (!isChecked(block)) {
                result.merge(block.getPage().getPageId(), 1, Integer::sum);
            }
        }

        return result;
    }

    // TODO 블록이 체크됐는지 (형식이 올바르지 않은 content는 미완료로 계산해요)
    private boolean isChecked(Block block) {

        try {
            JsonNode node = block.getContent() == null ? null : OBJECT_MAPPER.readTree(block.getContent());
            return node != null && node.path("checked").asBoolean(false);
        } catch (Exception e) {
            return false;
        }
    }

    // 회고 요약 생성
    private RetrospectiveSummary createSummary(List<TaskSnapshot> snapshots,
        Map<Long, List<TaskSnapshotAssignee>> assigneesBySnapshot) {

        int total = snapshots.size();

        int completed = (int) snapshots.stream().filter(s -> "DONE".equals(s.getSnapshotStatus().getName())).count();

        int incomplete = total - completed;

        int completionRate = total == 0 ? 0 : Math.round((completed * 100f) / total);

        Map<Long, ParticipantItem> participantMap = new LinkedHashMap<>();

        for (TaskSnapshot snapshot : snapshots) {

            for (TaskSnapshotAssignee assignee : assigneesBySnapshot.getOrDefault(snapshot.getSnapshotId(),
                List.of())) {

                if (assignee.getOriginalUserId() == null) {
                    continue;
                }

                participantMap.putIfAbsent(assignee.getOriginalUserId(),
                    new ParticipantItem(assignee.getOriginalUserId(), assignee.getNickname(),
                        assignee.getProfileFile() == null ? null : assignee.getProfileFile().getFileId(),
                        assignee.getProfileFile() == null ? null : assignee.getProfileFile().getFileUrl()));
            }
        }

        return new RetrospectiveSummary(completionRate, completed, incomplete, total,
            new ArrayList<>(participantMap.values()));
    }

    // 스프린트 회고 조회
    public RetrospectiveResponse getBySprint(Long sprintId, String email) {

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        Retrospective retrospective = retrospectiveRepository.findBySprint(sprint)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.RETROSPECTIVE_NOT_FOUND));

        return getRetrospective(retrospective.getRetrospectiveId(), email);
    }
}