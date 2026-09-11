package com.flowspace.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;

import com.flowspace.dto.sprint.SprintCreateRequest;
import com.flowspace.dto.sprint.SprintResponse;
import com.flowspace.dto.sprint.SprintStatusUpdateRequest;
import com.flowspace.dto.sprint.SprintUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.Page;
import com.flowspace.entity.Retrospective;
import com.flowspace.entity.RetrospectiveStatusSnapshot;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.SubTask;
import com.flowspace.entity.SubTaskSnapshot;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.TaskSnapshot;
import com.flowspace.entity.TaskSnapshotAssignee;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceTaskStatus;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.entity.enums.DatabaseColumnType;
import com.flowspace.entity.enums.DatabaseViewType;
import com.flowspace.entity.enums.SprintStatus;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.BlockDatabaseCell;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockDatabaseCellRepository;
import com.flowspace.repository.BlockDatabaseColumnRepository;
import com.flowspace.repository.BlockDatabaseRepository;
import com.flowspace.repository.BlockDatabaseRowRepository;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.RetrospectiveRepository;
import com.flowspace.repository.RetrospectiveStatusSnapshotRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.SubTaskRepository;
import com.flowspace.repository.SubTaskSnapshotRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.TaskSnapshotAssigneeRepository;
import com.flowspace.repository.TaskSnapshotRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import com.flowspace.repository.WorkspaceTaskStatusRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SprintService {

    private final SprintRepository sprintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TaskRepository taskRepository;
    private final PageRepository pageRepository;
    private final BlockRepository blockRepository;
    private final BlockDatabaseRepository blockDatabaseRepository;
    private final BlockDatabaseRowRepository blockDatabaseRowRepository;
    private final BlockDatabaseCellRepository blockDatabaseCellRepository;
    private final BlockDatabaseColumnRepository blockDatabaseColumnRepository;
    private final WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    private final RetrospectiveRepository retrospectiveRepository;
    private final RetrospectiveStatusSnapshotRepository statusSnapshotRepository;
    private final TaskSnapshotRepository taskSnapshotRepository;
    private final TaskSnapshotAssigneeRepository taskSnapshotAssigneeRepository;
    private final SubTaskSnapshotRepository subTaskSnapshotRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final SubTaskRepository subTaskRepository;
    private final UserRepository userRepository;

    private final ActivityService activityService;

    // 스프린트 생성
    public SprintResponse createSprint(Long workspaceId, SprintCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);
        validateSprintDate(request.startDate(), request.endDate());

        Sprint sprint = Sprint.builder().workspace(workspace).createdBy(user).name(request.name()).goal(request.goal())
            .description(request.description()).color(request.color()).startDate(request.startDate())
            .endDate(request.endDate()).status(request.status()).build();

        sprintRepository.save(sprint);

        activityService.log(workspace, user, ActivityType.SPRINT_CREATED, ActivityTargetType.SPRINT,
            sprint.getSprintId());

        return toSprintResponse(sprint);
    }

    // 워크스페이스 스프린트 목록 조회
    @Transactional(readOnly = true)
    public List<SprintResponse> getSprints(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);

        List<SprintResponse> result = new ArrayList<>();

        long backlogCount = taskRepository.countByWorkspaceAndSprintIsNull(workspace);

        result.add(SprintResponse.backlog(workspace.getWorkspaceId(), (int) backlogCount));

        result.addAll(sprintRepository.findByWorkspaceOrderByStartDateDesc(workspace).stream()
            .map(this::toSprintResponse).toList());

        return result;
    }

    // 스프린트 단건 조회
    @Transactional(readOnly = true)
    public SprintResponse getSprint(Long sprintId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        return toSprintResponse(sprint);
    }

    // 스프린트 수정
    public SprintResponse updateSprint(Long sprintId, SprintUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);
        validateSprintDate(request.startDate(), request.endDate());

        sprint.update(request.name(), request.goal(), request.description(), request.color(), request.startDate(),
            request.endDate());

        return toSprintResponse(sprint);
    }

    // 스프린트 상태 변경
    public SprintResponse updateStatus(Long sprintId, SprintStatusUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        if (request.status() == SprintStatus.COMPLETED && sprint.getStatus() != SprintStatus.COMPLETED) {

            if (retrospectiveRepository.existsBySprint(sprint)) {
                throw new FlowSpaceException(ErrorCode.RETROSPECTIVE_ALREADY_EXISTS);
            }

            createRetrospective(sprint, user);

            moveTasksToBacklog(sprint);

            activityService.log(sprint.getWorkspace(), user, ActivityType.SPRINT_COMPLETED, ActivityTargetType.SPRINT,
                sprint.getSprintId());
        }

        sprint.updateStatus(request.status());

        return toSprintResponse(sprint);
    }

    // 스프린트 삭제
    public void deleteSprint(Long sprintId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        moveTasksToBacklog(sprint);

        sprintRepository.delete(sprint);
    }

    // 워크스페이스 멤버 확인
    private void validateMember(Workspace workspace, User user) {
        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
    }

    // 스프린트 날짜 검증
    private void validateSprintDate(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new FlowSpaceException(ErrorCode.INVALID_SPRINT_DATE);
        }
    }

    // 스프린트 진행률 계산
    private SprintResponse toSprintResponse(Sprint sprint) {

        int taskCount = (int) taskRepository.countBySprint(sprint);

        int completedTaskCount = (int) taskRepository.countBySprintAndStatus_Category(sprint, TaskStatusCategory.DONE);

        int progress = taskCount == 0 ? 0 : (completedTaskCount * 100) / taskCount;

        return SprintResponse.from(sprint, progress, taskCount, completedTaskCount);
    }

    // 스프린트 Task를 Backlog로 이동
    private void moveTasksToBacklog(Sprint sprint) {

        int position = taskRepository.findByWorkspaceAndSprintIsNullOrderByPositionAsc(sprint.getWorkspace()).size();

        List<Task> sprintTasks = taskRepository.findBySprintOrderByPositionAsc(sprint);

        for (Task task : sprintTasks) {
            task.updateSprint(null);
            task.updatePosition(BigDecimal.valueOf(position));
            position++;
        }
    }

    // 회고 생성
    private void createRetrospective(Sprint sprint, User user) {

        Page page = createRetrospectivePage(sprint, user);

        Retrospective retrospective = retrospectiveRepository
            .save(Retrospective.builder().sprint(sprint).page(page).build());

        createRetrospectiveTable(page, user);

        List<RetrospectiveStatusSnapshot> snapshots = createStatusSnapshots(retrospective, sprint);

        createTaskSnapshots(retrospective, sprint, snapshots);
    }

    // 회고 페이지 생성
    private Page createRetrospectivePage(Sprint sprint, User user) {

        Page page = Page.builder().workspace(sprint.getWorkspace()).parentPage(null).title(sprint.getName() + " 회고")
            .icon("🚀").createdBy(user).build();

        page = pageRepository.save(page);

        activityService.log(sprint.getWorkspace(), user, ActivityType.PAGE_CREATED, ActivityTargetType.PAGE,
            page.getPageId());

        return page;
    }

    // 회고 기본 테이블 생성
    private void createRetrospectiveTable(Page page, User user) {

        BigDecimal position = BigDecimal.valueOf(blockRepository.findByPageOrderByPositionAsc(page).size());

        Block block = Block.builder().page(page).type(BlockType.DATABASE).position(position).createdBy(user).build();

        blockRepository.save(block);

        BlockDatabase database = BlockDatabase.builder().block(block).title("회고").viewType(DatabaseViewType.TABLE)
            .build();

        blockDatabaseRepository.save(database);

        List<BlockDatabaseColumn> columns = new ArrayList<>();

        columns.add(blockDatabaseColumnRepository.save(BlockDatabaseColumn.builder().database(database).name("Keep")
            .type(DatabaseColumnType.TEXT).position(0).build()));

        columns.add(blockDatabaseColumnRepository.save(BlockDatabaseColumn.builder().database(database).name("Problem")
            .type(DatabaseColumnType.TEXT).position(1).build()));

        columns.add(blockDatabaseColumnRepository.save(BlockDatabaseColumn.builder().database(database).name("Try")
            .type(DatabaseColumnType.TEXT).position(2).build()));

        for (int i = 0; i < 4; i++) {

            BlockDatabaseRow row = BlockDatabaseRow.builder().database(database).position(i).build();

            blockDatabaseRowRepository.save(row);

            for (BlockDatabaseColumn column : columns) {

                blockDatabaseCellRepository
                    .save(BlockDatabaseCell.builder().row(row).column(column).value(null).build());
            }
        }
    }

    // 상태 스냅샷 생성
    private List<RetrospectiveStatusSnapshot> createStatusSnapshots(Retrospective retrospective, Sprint sprint) {

        List<WorkspaceTaskStatus> statuses = workspaceTaskStatusRepository
            .findByWorkspaceOrderByPositionAsc(sprint.getWorkspace());

        List<RetrospectiveStatusSnapshot> result = new ArrayList<>();

        for (WorkspaceTaskStatus status : statuses) {

            RetrospectiveStatusSnapshot snapshot = statusSnapshotRepository
                .save(RetrospectiveStatusSnapshot.builder().retrospective(retrospective)
                    .originalStatusId(status.getTaskStatus().getStatusId()).name(status.getTaskStatus().getName())
                    .color(status.getTaskStatus().getColor().name()).position(status.getPosition()).build());

            result.add(snapshot);
        }

        return result;
    }

    // Task 스냅샷 생성
    private void createTaskSnapshots(Retrospective retrospective, Sprint sprint,
        List<RetrospectiveStatusSnapshot> snapshots) {

        Map<Long, RetrospectiveStatusSnapshot> statusMap = snapshots.stream()
            .collect(Collectors.toMap(s -> s.getOriginalStatusId(), s -> s));

        List<Task> tasks = taskRepository.findBySprintOrderByPositionAsc(sprint);

        for (Task task : tasks) {

            TaskSnapshot snapshot = taskSnapshotRepository.save(TaskSnapshot.builder().retrospective(retrospective)
                .snapshotStatus(statusMap.get(task.getStatus().getStatusId())).originalTaskId(task.getTaskId())
                .title(task.getTitle()).priority(task.getPriority().name()).position(task.getPosition()).build());

            createTaskSnapshotAssignees(snapshot, task);
            createSubTaskSnapshots(snapshot, task);
        }
    }

    // Task 담당자 스냅샷 생성
    private void createTaskSnapshotAssignees(TaskSnapshot snapshot, Task task) {

        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        for (TaskAssignee assignee : assignees) {

            taskSnapshotAssigneeRepository.save(TaskSnapshotAssignee.builder().snapshot(snapshot)
                .originalUserId(assignee.getUser().getUserId()).nickname(assignee.getUser().getNickname())
                .profileFile(assignee.getUser().getProfileFile()).build());
        }
    }

    // SubTask 스냅샷 생성
    private void createSubTaskSnapshots(TaskSnapshot snapshot, Task task) {

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);

        for (SubTask subtask : subtasks) {

            User assignee = subtask.getAssignee();

            subTaskSnapshotRepository.save(SubTaskSnapshot.builder().snapshot(snapshot)
                .originalSubtaskId(subtask.getSubtaskId()).content(subtask.getContent())
                .isCompleted(subtask.getIsCompleted()).assigneeName(assignee == null ? null : assignee.getNickname())
                .assigneeProfileFile(assignee == null ? null : assignee.getProfileFile())
                .position(subtask.getPosition()).build());
        }
    }
}