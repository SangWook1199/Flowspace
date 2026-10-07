package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import com.flowspace.dto.task.TaskCreateRequest;
import com.flowspace.dto.task.TaskReorderRequest;
import com.flowspace.dto.task.TaskResponse;
import com.flowspace.dto.task.TaskSearchResponse;
import com.flowspace.dto.task.TaskSprintUpdateRequest;
import com.flowspace.dto.task.TaskStatusCreateRequest;
import com.flowspace.dto.task.TaskStatusDeleteRequest;
import com.flowspace.dto.task.TaskStatusEditRequest;
import com.flowspace.dto.task.TaskStatusReorderRequest;
import com.flowspace.dto.task.TaskStatusResponse;
import com.flowspace.dto.task.TaskStatusUpdateRequest;
import com.flowspace.dto.task.TaskUpdateRequest;
import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.dto.task.SubTaskCreateRequest;
import com.flowspace.dto.task.SubTaskReorderRequest;
import com.flowspace.dto.task.SubTaskResponse;
import com.flowspace.dto.task.SubTaskUpdateRequest;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.SubTask;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceTaskStatus;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.NotificationType;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.id.WorkspaceTaskStatusId;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.CommentRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.SubTaskRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.TaskStatusRepository;
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
public class TaskService {

    private final TaskStatusRepository taskStatusRepository;
    private final WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final SubTaskRepository subTaskRepository;
    private final CommentRepository commentRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final UserRepository userRepository;

    private final ActivityService activityService;
    private final NotificationService notificationService;

    // Task 상태 생성
    public TaskStatusResponse createStatus(Long workspaceId, TaskStatusCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = (int) workspaceTaskStatusRepository.countByWorkspace(workspace);

        TaskStatus status = taskStatusRepository.save(
            TaskStatus.builder().name(request.name()).category(request.category()).color(request.color()).build());

        WorkspaceTaskStatus mapping = WorkspaceTaskStatus.builder()
            .id(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), status.getStatusId())).workspace(workspace)
            .taskStatus(status).position(position).wipLimit(request.wipLimit()).build();

        workspaceTaskStatusRepository.save(mapping);

        return TaskStatusResponse.from(mapping);
    }

    // Task 상태 목록 조회
    @Transactional(readOnly = true)
    public List<TaskStatusResponse> getStatuses(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return workspaceTaskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace).stream()
            .map(mapping -> TaskStatusResponse.from(mapping)).toList();
    }

    // Task 상태 수정
    public TaskStatusResponse updateStatusInfo(Long statusId, TaskStatusEditRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        WorkspaceTaskStatus mapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(request.workspaceId(), statusId))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(mapping.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 기본 상태(1,2,3) 수정 → 공용 기본 상태는 그대로 두고, 이 워크스페이스 전용 새 상태로 바꿔 끼운다
        if (mapping.getIsDefault()) {

            Workspace workspace = mapping.getWorkspace();

            TaskStatus newStatus = taskStatusRepository.save(
                TaskStatus.builder().name(request.name()).category(request.category()).color(request.color()).build());

            // 같은 자리(position)에 새 상태를 넣는다
            WorkspaceTaskStatus newMapping = WorkspaceTaskStatus.builder()
                .id(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), newStatus.getStatusId()))
                .workspace(workspace).taskStatus(newStatus).position(mapping.getPosition())
                .wipLimit(request.wipLimit()).isDefault(false).build();

            workspaceTaskStatusRepository.save(newMapping);

            // 이 워크스페이스의 작업만 새 상태로 옮기고, 이 워크스페이스에서는 기존 기본 상태 연결을 뺀다
            taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, mapping.getTaskStatus())
                .forEach(task -> task.replaceStatus(newStatus));

            workspaceTaskStatusRepository.delete(mapping);

            return TaskStatusResponse.from(newMapping);
        }

        // 커스텀 상태 수정
        mapping.getTaskStatus().update(request.name(), request.category(), request.color());
        mapping.updateWipLimit(request.wipLimit());

        return TaskStatusResponse.from(mapping);
    }

    // Task 상태 순서 변경
    public void reorderStatuses(TaskStatusReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(request.workspaceId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        for (TaskStatusReorderRequest.Item item : request.statuses()) {

            WorkspaceTaskStatus mapping = workspaceTaskStatusRepository
                .findById(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), item.statusId()))
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

            mapping.updatePosition(item.position());
        }
    }

    // Task 상태 삭제
    public void deleteStatus(Long statusId, TaskStatusDeleteRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        WorkspaceTaskStatus mapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(request.workspaceId(), statusId))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(mapping.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 마지막 남은 상태는 삭제할 수 없고, 작업을 옮길 대상이 삭제하는 상태 자신일 수도 없다
        if (workspaceTaskStatusRepository.countByWorkspace(mapping.getWorkspace()) <= 1) {
            throw new FlowSpaceException(ErrorCode.LAST_TASK_STATUS_CANNOT_DELETE);
        }

        if (statusId.equals(request.targetStatusId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        WorkspaceTaskStatus targetMapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(request.workspaceId(), request.targetStatusId()))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        // 같은 워크스페이스 Task만 이동
        taskRepository.findByStatusOrderByPositionAsc(mapping.getTaskStatus()).stream()
            .filter(task -> task.getWorkspace().getWorkspaceId().equals(request.workspaceId()))
            .forEach(task -> task.updateStatus(targetMapping.getTaskStatus()));

        workspaceTaskStatusRepository.delete(mapping);

        // 기본 상태(1,2,3)는 모든 워크스페이스가 같이 쓰는 행이라 DB에서 지우지 않고 이 워크스페이스의 연결만 끊는다
        if (!mapping.getIsDefault()) {
            taskStatusRepository.delete(mapping.getTaskStatus());
        }
    }

    // Task 생성
    public TaskResponse createTask(Long sprintId, TaskCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return saveNewTask(sprint.getWorkspace(), sprint, request, user);
    }

    // Backlog Task 생성 (스프린트 없이 워크스페이스에 바로 만든다)
    public TaskResponse createBacklogTask(Long workspaceId, TaskCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return saveNewTask(workspace, null, request, user);
    }

    // Task 저장 공통 처리 (sprint가 null이면 Backlog Task)
    private TaskResponse saveNewTask(Workspace workspace, Sprint sprint, TaskCreateRequest request, User user) {

        TaskStatus status = validateWorkspaceStatus(workspace, request.statusId());

        BigDecimal position = BigDecimal
            .valueOf(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, status).size());

        // 작업 번호는 워크스페이스 기준으로 다음 번호를 줘요(스프린트와 상관없이 T-1, T-2 … 로 이어져요).
        int taskNumber = taskRepository.findMaxTaskNumber(workspace) + 1;

        Task task = Task.builder().workspace(workspace).sprint(sprint).createdBy(user).status(status)
            .taskNumber(taskNumber).position(position).title(request.title()).description(request.description()).startDate(request.startDate())
            .endDate(request.endDate()).priority(request.priority()).build();

        taskRepository.save(task);

        activityService.log(workspace, user, ActivityType.TASK_CREATED, ActivityTargetType.TASK, task.getTaskId());

        List<Long> assigneeIds = request.assigneeIds() == null ? List.of() : request.assigneeIds();

        for (Long assigneeId : assigneeIds) {

            User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(workspace, assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            taskAssigneeRepository.save(TaskAssignee.builder().task(task).user(assignee).build());

            notifyAssigned(task, assignee, user);
        }

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        return TaskResponse.from(task, assignees, subtasks, comments);
    }

    // 스프린트 Task 목록 조회
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksBySprint(Long sprintId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return taskRepository.findBySprintOrderByPositionAsc(sprint).stream().map(task -> {
            List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
            List<CommentResponse> comments = getTaskCommentResponses(task);
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return TaskResponse.from(task, assignees, subtasks, comments);
        }).toList();
    }

    // Task 단건 조회
    @Transactional(readOnly = true)
    public TaskResponse getTask(Long taskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        return TaskResponse.from(task, assignees, subtasks, comments);
    }

    // Task 수정
    public TaskResponse updateTask(Long taskId, TaskUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Sprint sprint = null;

        if (request.sprintId() != null) {
            sprint = sprintRepository.findById(request.sprintId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

            if (!sprint.getWorkspace().getWorkspaceId().equals(task.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }
        }

        TaskStatus status = validateWorkspaceStatus(task.getWorkspace(), request.statusId());

        BigDecimal position = task.getPosition();

        boolean sprintChanged = !Objects.equals(task.getSprint() == null ? null : task.getSprint().getSprintId(),
            request.sprintId());

        boolean statusChanged = !task.getStatus().getStatusId().equals(request.statusId());

        if (sprintChanged || statusChanged) {
            position = BigDecimal
                .valueOf(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(task.getWorkspace(), status).size());
        }

        task.update(sprint, status, request.title(), request.description(), request.startDate(), request.endDate(),
            request.priority());

        task.updatePosition(position);

        // 새로 담당자가 된 사람에게만 알리려고, 바꾸기 전 담당자를 기억해둬요.
        Set<Long> previousAssigneeIds = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task).stream()
            .map(assignee -> assignee.getUser().getUserId()).collect(Collectors.toSet());

        taskAssigneeRepository.deleteByTask(task);
        // 같은 담당자를 다시 넣을 때 (작업, 담당자) 중복으로 걸리지 않게, 지운 것을 먼저 DB에 반영해요.
        taskAssigneeRepository.flush();

        List<Long> assigneeIds = request.assigneeIds() == null ? List.of() : request.assigneeIds();

        for (Long assigneeId : assigneeIds) {

            User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            taskAssigneeRepository.save(TaskAssignee.builder().task(task).user(assignee).build());

            if (!previousAssigneeIds.contains(assignee.getUserId())) {
                notifyAssigned(task, assignee, user);
            }
        }

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);

        // 하위 작업 담당자는 작업 담당자 중에서만 고를 수 있어서, 작업 담당자에서 빠진 사람은 하위 작업에서도 비워요.
        for (SubTask subtask : subtasks) {
            if (subtask.getAssignee() != null && !assigneeIds.contains(subtask.getAssignee().getUserId())) {
                subtask.update(subtask.getContent(), null);
            }
        }

        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        // 상태가 바뀌었으면 (이번에 새로 담당자가 된 사람을 뺀) 담당자들에게 알려요.
        if (statusChanged) {
            notifyStatusChanged(task, status, user,
                assignees.stream().filter(a -> previousAssigneeIds.contains(a.getUser().getUserId())).toList());
        }

        return TaskResponse.from(task, assignees, subtasks, comments);
    }

    // Backlog Task 목록 조회
    @Transactional(readOnly = true)
    public List<TaskResponse> getBacklogTasks(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return taskRepository.findByWorkspaceAndSprintIsNullOrderByPositionAsc(workspace).stream().map(task -> {
            List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
            List<CommentResponse> comments = getTaskCommentResponses(task);
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return TaskResponse.from(task, assignees, subtasks, comments);
        }).toList();
    }

    // Task 상태 변경
    public TaskResponse updateTaskStatus(Long taskId, TaskStatusUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        TaskStatus status = validateWorkspaceStatus(task.getWorkspace(), request.statusId());

        // 같은 Status면 변경하지 않음
        if (task.getStatus().getStatusId().equals(request.statusId())) {
            List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
            List<CommentResponse> comments = getTaskCommentResponses(task);
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return TaskResponse.from(task, assignees, subtasks, comments);
        }

        BigDecimal position = BigDecimal
            .valueOf(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(task.getWorkspace(), status).size());

        task.updateStatus(status);

        if (status.getCategory() == TaskStatusCategory.DONE) {
            activityService.log(task.getWorkspace(), user, ActivityType.TASK_COMPLETED, ActivityTargetType.TASK,
                task.getTaskId());

        }

        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        notifyStatusChanged(task, status, user, assignees);

        return TaskResponse.from(task, assignees, subtasks, comments);
    }

    // Task 삭제
    public void deleteTask(Long taskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        TaskStatus status = task.getStatus();
        Sprint sprint = task.getSprint();

        taskRepository.delete(task);

        List<Task> tasks;

        if (sprint == null) {
            tasks = taskRepository.findByWorkspaceAndSprintIsNullOrderByPositionAsc(task.getWorkspace()).stream()
                .filter(t -> t.getStatus().getStatusId().equals(status.getStatusId())).toList();
        } else {
            tasks = taskRepository.findBySprintOrderByPositionAsc(sprint).stream()
                .filter(t -> t.getStatus().getStatusId().equals(status.getStatusId())).toList();
        }

        int position = 0;
        for (Task t : tasks) {
            t.updatePosition(BigDecimal.valueOf(position));
            position++;
        }
    }

    // SubTask 생성
    public SubTaskResponse createSubTask(Long taskId, SubTaskCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        User assignee = null;

        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            if (!taskAssigneeRepository.existsByTaskAndUser(task, assignee)) {
                throw new FlowSpaceException(ErrorCode.INVALID_SUBTASK_ASSIGNEE);
            }
        }

        int position = subTaskRepository.findByTaskOrderByPositionAsc(task).size();

        SubTask subTask = SubTask.builder().task(task).assignee(assignee).content(request.content()).position(position)
            .build();

        subTaskRepository.save(subTask);

        return SubTaskResponse.from(subTask);
    }

    // SubTask 목록 조회
    @Transactional(readOnly = true)
    public List<SubTaskResponse> getSubTasks(Long taskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return subTaskRepository.findByTaskOrderByPositionAsc(task).stream().map(SubTaskResponse::from).toList();
    }

    // SubTask 수정
    public SubTaskResponse updateSubTask(Long subTaskId, SubTaskUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        SubTask subTask = subTaskRepository.findById(subTaskId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SUBTASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(subTask.getTask().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        User assignee = null;

        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            if (!taskAssigneeRepository.existsByTaskAndUser(subTask.getTask(), assignee)) {
                throw new FlowSpaceException(ErrorCode.INVALID_SUBTASK_ASSIGNEE);
            }
        }

        subTask.update(request.content(), assignee);
        subTask.updateCompleted(request.isCompleted());

        return SubTaskResponse.from(subTask);
    }

    // SubTask 순서 변경
    public void reorderSubTasks(SubTaskReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        for (SubTaskReorderRequest.Item item : request.subtasks()) {

            SubTask subTask = subTaskRepository.findById(item.subtaskId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.SUBTASK_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(subTask.getTask().getWorkspace(), user)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            subTask.updatePosition(item.position());
        }
    }

    // SubTask 삭제
    public void deleteSubTask(Long subtaskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        SubTask subTask = subTaskRepository.findById(subtaskId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SUBTASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(subTask.getTask().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        subTaskRepository.delete(subTask);
    }

    // Task 스프린트 이동
    public TaskResponse updateTaskSprint(Long taskId, TaskSprintUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (Objects.equals(task.getSprint() == null ? null : task.getSprint().getSprintId(), request.sprintId())) {

            List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
            List<CommentResponse> comments = getTaskCommentResponses(task);
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return TaskResponse.from(task, assignees, subtasks, comments);
        }

        Sprint sprint = null;

        if (request.sprintId() != null) {
            sprint = sprintRepository.findById(request.sprintId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

            if (!sprint.getWorkspace().getWorkspaceId().equals(task.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_SPRINT);
            }
        }

        BigDecimal position;

        if (sprint == null) {
            position = BigDecimal.valueOf(taskRepository
                .findByWorkspaceAndStatusOrderByPositionAsc(task.getWorkspace(), task.getStatus()).size());
        } else {
            position = BigDecimal.valueOf(taskRepository
                .findByWorkspaceAndStatusOrderByPositionAsc(task.getWorkspace(), task.getStatus()).size());
        }

        task.updateSprint(sprint);
        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

        return TaskResponse.from(task, assignees, subtasks, comments);
    }

    // Task 순서 변경
    public void reorderTasks(TaskReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        for (TaskReorderRequest.Item item : request.tasks()) {

            Task task = taskRepository.findById(item.taskId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            TaskStatus status = validateWorkspaceStatus(task.getWorkspace(), item.statusId());

            // 칸반에서 다른 열로 옮긴 작업만(같은 열 안에서 순서만 바꾼 건 제외) 알려요.
            boolean statusChanged = !task.getStatus().getStatusId().equals(status.getStatusId());

            task.updateStatus(status);
            task.updatePosition(item.position());

            if (statusChanged) {
                notifyStatusChanged(task, status, user,
                    taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task));
            }
        }
    }

    // 담당자로 지정된 사람에게 알림
    private void notifyAssigned(Task task, User assignee, User actor) {
        notificationService.send(assignee, actor, task.getWorkspace(), NotificationType.TASK_ASSIGNED,
            actor.getNickname() + "님이 '" + task.getTitle() + "' 작업의 담당자로 지정했어요.", task.getTaskId(),
            NotificationService.taskLink(task));
    }

    // 작업 상태가 바뀌었음을 담당자들에게 알림 (바꾼 본인은 제외돼요)
    private void notifyStatusChanged(Task task, TaskStatus status, User actor, List<TaskAssignee> assignees) {
        notificationService.sendAll(assignees.stream().map(TaskAssignee::getUser).toList(), actor,
            task.getWorkspace(), NotificationType.TASK_STATUS_CHANGED,
            actor.getNickname() + "님이 '" + task.getTitle() + "' 작업을 '" + status.getName() + "' 상태로 바꿨어요.",
            task.getTaskId(), NotificationService.taskLink(task));
    }

    // 공통 검증 메서드
    private TaskStatus validateWorkspaceStatus(Workspace workspace, Long statusId) {

        WorkspaceTaskStatus mapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), statusId))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS));

        return mapping.getTaskStatus();
    }

    // Task 검색
    @Transactional(readOnly = true)
    public List<TaskSearchResponse> searchTasks(Long workspaceId, String keyword, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        String search = keyword == null ? "" : keyword;

        return taskRepository.findByWorkspaceAndTitleContainingIgnoreCase(workspace, search).stream().map(task -> {
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return TaskSearchResponse.from(task, assignees);
        }).toList();
    }

    // Task 댓글 조회
    private List<CommentResponse> getTaskCommentResponses(Task task) {

        return commentRepository.findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(task).stream().map(comment -> {
            List<CommentResponse> replies = commentRepository.findByParentCommentOrderByCreatedAtAsc(comment).stream()
                .map(reply -> CommentResponse.from(reply, List.of())).toList();

            return CommentResponse.from(comment, replies);
        }).toList();
    }
}