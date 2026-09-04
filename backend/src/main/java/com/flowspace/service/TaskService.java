package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

import com.flowspace.dto.task.TaskCreateRequest;
import com.flowspace.dto.task.TaskReorderRequest;
import com.flowspace.dto.task.TaskResponse;
import com.flowspace.dto.task.TaskSprintUpdateRequest;
import com.flowspace.dto.task.TaskStatusCreateRequest;
import com.flowspace.dto.task.TaskStatusDeleteRequest;
import com.flowspace.dto.task.TaskStatusEditRequest;
import com.flowspace.dto.task.TaskStatusReorderRequest;
import com.flowspace.dto.task.TaskStatusResponse;
import com.flowspace.dto.task.TaskStatusUpdateRequest;
import com.flowspace.dto.task.TaskUpdateRequest;
import com.flowspace.dto.task.SubTaskCreateRequest;
import com.flowspace.dto.task.SubTaskReorderRequest;
import com.flowspace.dto.task.SubTaskResponse;
import com.flowspace.dto.task.SubTaskUpdateRequest;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.SubTask;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.SubTaskRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.TaskStatusRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskStatusRepository taskStatusRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final SubTaskRepository subTaskRepository;
    private final UserRepository userRepository;

    // Task 상태 생성
    public TaskStatusResponse createStatus(Long workspaceId, TaskStatusCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = taskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace).size();

        TaskStatus status = TaskStatus.builder().workspace(workspace).name(request.name()).category(request.category())
            .color(request.color()).position(position).build();

        taskStatusRepository.save(status);

        return TaskStatusResponse.from(status);
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

        return taskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace).stream().map(TaskStatusResponse::from)
            .toList();
    }

    // Task 상태 수정
    public TaskStatusResponse updateStatusInfo(Long statusId, TaskStatusEditRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        TaskStatus status = taskStatusRepository.findById(statusId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(status.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        status.update(request.name(), request.category(), request.color());

        return TaskStatusResponse.from(status);
    }

    // Task 상태 순서 변경
    public void reorderStatuses(TaskStatusReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        for (var item : request.statuses()) {

            TaskStatus status = taskStatusRepository.findById(item.statusId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(status.getWorkspace(), user)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

            status.updatePosition(item.position());
        }
    }

    // Task 상태 삭제
    public void deleteStatus(Long statusId, TaskStatusDeleteRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        TaskStatus status = taskStatusRepository.findById(statusId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        TaskStatus targetStatus = taskStatusRepository.findById(request.targetStatusId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(status.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (!status.getWorkspace().getWorkspaceId().equals(targetStatus.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        if (status.getStatusId().equals(targetStatus.getStatusId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        int position = taskRepository
            .findByWorkspaceAndStatusOrderByPositionAsc(targetStatus.getWorkspace(), targetStatus).size();

        List<Task> tasks = taskRepository.findByStatusOrderByPositionAsc(status);

        for (Task task : tasks) {
            task.updateStatus(targetStatus);
            task.updatePosition(BigDecimal.valueOf(position));
            position++;
        }

        taskStatusRepository.delete(status);
    }

    // Task 생성
    public TaskResponse createTask(Long sprintId, TaskCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        TaskStatus status = taskStatusRepository.findById(request.statusId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        if (!status.getWorkspace().getWorkspaceId().equals(sprint.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        BigDecimal position = BigDecimal.valueOf(taskRepository.findBySprintOrderByPositionAsc(sprint).size());

        User assignee = null;
        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(sprint.getWorkspace(), assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
        }

        Task task = Task.builder().workspace(sprint.getWorkspace()).sprint(sprint).createdBy(user).assignee(assignee)
            .status(status).position(position).description(request.description()).startDate(request.startDate())
            .endDate(request.endDate()).priority(request.priority()).build();

        taskRepository.save(task);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
        return TaskResponse.from(task, subtasks);
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
            return TaskResponse.from(task, subtasks);
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

        return TaskResponse.from(task, subtasks);
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

        User assignee = null;
        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), assignee)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
        }

        TaskStatus status = taskStatusRepository.findById(request.statusId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        if (!status.getWorkspace().getWorkspaceId().equals(task.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        BigDecimal position = task.getPosition();

        if (!Objects.equals(task.getSprint() == null ? null : task.getSprint().getSprintId(), request.sprintId())) {

            if (sprint == null) {
                position = BigDecimal.valueOf(
                    taskRepository.findByWorkspaceAndSprintIsNullOrderByPositionAsc(task.getWorkspace()).size());
            } else {
                position = BigDecimal.valueOf(taskRepository.findBySprintOrderByPositionAsc(sprint).size());
            }
        }
        task.update(sprint, assignee, status, request.description(), request.startDate(), request.endDate(),
            request.priority());

        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);

        return TaskResponse.from(task, subtasks);
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
            return TaskResponse.from(task, subtasks);
        }).toList();
    }

    // Task 상태 변경
    public TaskResponse updateTaskStatus(Long taskId, TaskStatusUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        TaskStatus status = taskStatusRepository.findById(request.statusId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

        if (!status.getWorkspace().getWorkspaceId().equals(task.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
        }

        // 같은 Status면 변경하지 않음
        if (task.getStatus().getStatusId().equals(request.statusId())) {
            List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);
            return TaskResponse.from(task, subtasks);
        }

        BigDecimal position = BigDecimal
            .valueOf(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(task.getWorkspace(), status).size());

        task.updateStatus(status);
        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);

        return TaskResponse.from(task, subtasks);
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

        int position = (int) subTaskRepository.countByTask(task);

        SubTask subTask = SubTask.builder().task(task).content(request.content()).position(position).build();

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
    public SubTaskResponse updateSubTask(Long subtaskId, SubTaskUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        SubTask subTask = subTaskRepository.findById(subtaskId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SUBTASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(subTask.getTask().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        subTask.update(request.content());
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
            return TaskResponse.from(task, subtasks);
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
            position = BigDecimal
                .valueOf(taskRepository.findByWorkspaceAndSprintIsNullOrderByPositionAsc(task.getWorkspace()).size());
        } else {
            position = BigDecimal.valueOf(taskRepository.findBySprintOrderByPositionAsc(sprint).size());
        }

        task.updateSprint(sprint);
        task.updatePosition(position);

        List<SubTask> subtasks = subTaskRepository.findByTaskOrderByPositionAsc(task);

        return TaskResponse.from(task, subtasks);
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

            TaskStatus status = taskStatusRepository.findById(item.statusId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

            if (!task.getWorkspace().getWorkspaceId().equals(status.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS);
            }

            task.updateStatus(status);
            task.updatePosition(item.position());
        }
    }
}