package com.flowspace.service;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.dto.retrospective.*;
import com.flowspace.entity.*;
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

        RetrospectiveSummary summary = createSummary(snapshots);

        PageDetailResponse page = pageService.getPageDetail(retrospective.getPage().getPageId(), email);

        List<TaskSnapshotItem> taskItems = snapshots.stream().map(snapshot -> {

            List<TaskSnapshotAssignee> assignees = taskSnapshotAssigneeRepository
                .findBySnapshotOrderBySnapshotAssigneeIdAsc(snapshot);

            List<SubTaskSnapshot> subtasks = subTaskSnapshotRepository.findBySnapshotOrderByPositionAsc(snapshot);

            return TaskSnapshotItem.from(snapshot, assignees, subtasks);
        }).toList();

        return RetrospectiveResponse.from(retrospective, summary,
            statuses.stream().map(StatusSnapshotItem::from).toList(), taskItems, page);
    }

    // 회고 요약 생성
    private RetrospectiveSummary createSummary(List<TaskSnapshot> snapshots) {

        int total = snapshots.size();

        int completed = (int) snapshots.stream().filter(s -> "DONE".equals(s.getSnapshotStatus().getName())).count();

        int incomplete = total - completed;

        int completionRate = total == 0 ? 0 : Math.round((completed * 100f) / total);

        Map<Long, ParticipantItem> participantMap = new LinkedHashMap<>();

        for (TaskSnapshot snapshot : snapshots) {

            List<TaskSnapshotAssignee> assignees = taskSnapshotAssigneeRepository
                .findBySnapshotOrderBySnapshotAssigneeIdAsc(snapshot);

            for (TaskSnapshotAssignee assignee : assignees) {

                if (assignee.getOriginalUserId() == null) {
                    continue;
                }

                participantMap.putIfAbsent(assignee.getOriginalUserId(),
                    new ParticipantItem(assignee.getOriginalUserId(), assignee.getName(),
                        assignee.getProfileFile() == null ? null : assignee.getProfileFile().getFileId()));
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