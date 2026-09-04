package com.flowspace.controller;

import com.flowspace.dto.task.TaskCreateRequest;
import com.flowspace.dto.task.TaskResponse;
import com.flowspace.dto.task.TaskStatusCreateRequest;
import com.flowspace.dto.task.TaskStatusDeleteRequest;
import com.flowspace.dto.task.TaskStatusEditRequest;
import com.flowspace.dto.task.TaskStatusReorderRequest;
import com.flowspace.dto.task.TaskStatusResponse;
import com.flowspace.dto.task.TaskStatusUpdateRequest;
import com.flowspace.dto.task.TaskUpdateRequest;
import com.flowspace.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "Task 상태 생성")
    @PostMapping("/workspaces/{workspaceId}/task-statuses")
    public TaskStatusResponse createStatus(@PathVariable Long workspaceId,
        @Valid @RequestBody TaskStatusCreateRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.createStatus(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "Task 상태 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/task-statuses")
    public List<TaskStatusResponse> getStatuses(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.getStatuses(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "Task 상태 수정")
    @PatchMapping("/task-statuses/{statusId}")
    public TaskStatusResponse updateStatusInfo(@PathVariable Long statusId,
        @Valid @RequestBody TaskStatusEditRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.updateStatusInfo(statusId, request, userDetails.getUsername());
    }

    @Operation(summary = "Task 상태 순서 변경")
    @PatchMapping("/task-statuses/reorder")
    public void reorderStatuses(@Valid @RequestBody TaskStatusReorderRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        taskService.reorderStatuses(request, userDetails.getUsername());
    }

    @Operation(summary = "Task 상태 삭제")
    @DeleteMapping("/task-statuses/{statusId}")
    public void deleteStatus(@PathVariable Long statusId, @Valid @RequestBody TaskStatusDeleteRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        taskService.deleteStatus(statusId, request, userDetails.getUsername());
    }

    @Operation(summary = "Task 생성")
    @PostMapping("/sprints/{sprintId}/tasks")
    public TaskResponse createTask(@PathVariable Long sprintId, @Valid @RequestBody TaskCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.createTask(sprintId, request, userDetails.getUsername());
    }

    @Operation(summary = "Sprint Task 목록 조회")
    @GetMapping("/sprints/{sprintId}/tasks")
    public List<TaskResponse> getTasksBySprint(@PathVariable Long sprintId,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.getTasksBySprint(sprintId, userDetails.getUsername());
    }

    @Operation(summary = "Task 단건 조회")
    @GetMapping("/tasks/{taskId}")
    public TaskResponse getTask(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.getTask(taskId, userDetails.getUsername());
    }

    @Operation(summary = "Task 수정")
    @PatchMapping("/tasks/{taskId}")
    public TaskResponse updateTask(@PathVariable Long taskId, @Valid @RequestBody TaskUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.updateTask(taskId, request, userDetails.getUsername());
    }

    @Operation(summary = "Task 삭제")
    @DeleteMapping("/tasks/{taskId}")
    public void deleteTask(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails) {

        taskService.deleteTask(taskId, userDetails.getUsername());
    }

    @Operation(summary = "Task 상태 변경")
    @PatchMapping("/tasks/{taskId}/status")
    public TaskResponse updateTaskStatus(@PathVariable Long taskId, @Valid @RequestBody TaskStatusUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.updateTaskStatus(taskId, request, userDetails.getUsername());
    }

    @Operation(summary = "Backlog Task 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/backlog/tasks")
    public List<TaskResponse> getBacklogTasks(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.getBacklogTasks(workspaceId, userDetails.getUsername());
    }

}