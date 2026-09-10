package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

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
            .taskStatus(status).position(position).build();

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

        TaskStatus newStatus = taskStatusRepository.save(
            TaskStatus.builder().name(request.name()).category(request.category()).color(request.color()).build());

        WorkspaceTaskStatus newMapping = WorkspaceTaskStatus.builder()
            .id(new WorkspaceTaskStatusId(mapping.getWorkspace().getWorkspaceId(), newStatus.getStatusId()))
            .workspace(mapping.getWorkspace()).taskStatus(newStatus).position(mapping.getPosition()).build();

        workspaceTaskStatusRepository.delete(mapping);
        workspaceTaskStatusRepository.save(newMapping);

        taskRepository.findByStatusOrderByPositionAsc(mapping.getTaskStatus()).stream()
            .filter(task -> task.getWorkspace().getWorkspaceId().equals(mapping.getWorkspace().getWorkspaceId()))
            .forEach(task -> task.updateStatus(newStatus));

        return TaskStatusResponse.from(newMapping);
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

        Workspace workspace = workspaceRepository.findById(request.workspaceId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        WorkspaceTaskStatus sourceMapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), statusId))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        WorkspaceTaskStatus targetMapping = workspaceTaskStatusRepository
            .findById(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), request.targetStatusId()))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        if (statusId.equals(request.targetStatusId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        int position = taskRepository
            .findByWorkspaceAndStatusOrderByPositionAsc(workspace, targetMapping.getTaskStatus()).size();

        List<Task> tasks = taskRepository.findByStatusOrderByPositionAsc(sourceMapping.getTaskStatus());

        for (Task task : tasks) {
            if (!task.getWorkspace().getWorkspaceId().equals(workspace.getWorkspaceId())) {
                continue;
            }

            task.updateStatus(targetMapping.getTaskStatus());
            task.updatePosition(BigDecimal.valueOf(position));
            position++;
        }

        workspaceTaskStatusRepository.delete(sourceMapping);
    }

    // Task 생성
    public TaskResponse createTask(Long sprintId, TaskCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        TaskStatus status = validateWorkspaceStatus(sprint.getWorkspace(), request.statusId());

        BigDecimal position = BigDecimal
            .valueOf(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(sprint.getWorkspace(), status).size());

        Task task = Task.builder().workspace(sprint.getWorkspace()).sprint(sprint).createdBy(user).status(status)
            .position(position).title(request.title()).description(request.description()).startDate(request.startDate())
            .endDate(request.endDate()).priority(request.priority()).build();

        taskRepository.save(task);

        for (Long assigneeId : request.assigneeIds()) {

            User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            taskAssigneeRepository.save(TaskAssignee.builder().task(task).user(assignee).build());
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

        taskAssigneeRepository.deleteByTask(task);

        for (Long assigneeId : request.assigneeIds()) {

            User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            taskAssigneeRepository.save(TaskAssignee.builder().task(task).user(assignee).build());
        }

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

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
        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        List<CommentResponse> comments = getTaskCommentResponses(task);
        List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

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

            task.updateStatus(status);
            task.updatePosition(item.position());
        }
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