package com.flowspace.service;

import java.util.List;

import com.flowspace.dto.task.TaskStatusCreateRequest;
import com.flowspace.dto.task.TaskStatusDeleteRequest;
import com.flowspace.dto.task.TaskStatusEditRequest;
import com.flowspace.dto.task.TaskStatusReorderRequest;
import com.flowspace.dto.task.TaskStatusResponse;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
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
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
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

        taskRepository.findByStatus(status).forEach(task -> task.updateStatus(targetStatus));

        taskStatusRepository.delete(status);
    }
}