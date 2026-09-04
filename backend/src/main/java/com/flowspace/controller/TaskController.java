package com.flowspace.controller;

import com.flowspace.dto.task.SubTaskCreateRequest;
import com.flowspace.dto.task.SubTaskReorderRequest;
import com.flowspace.dto.task.SubTaskResponse;
import com.flowspace.dto.task.SubTaskUpdateRequest;
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

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    // SubTask 생성
    @Operation(summary = "SubTask 생성")
    @PostMapping("/{taskId}/subtasks")
    public ResponseEntity<SubTaskResponse> createSubTask(@PathVariable Long taskId,
        @Valid @RequestBody SubTaskCreateRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(taskService.createSubTask(taskId, request, userDetails.getUsername()));
    }

    // SubTask 목록 조회
    @Operation(summary = "SubTask 목록 조회")
    @GetMapping("/{taskId}/subtasks")
    public ResponseEntity<List<SubTaskResponse>> getSubTasks(@PathVariable Long taskId,
        @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(taskService.getSubTasks(taskId, userDetails.getUsername()));
    }

    // SubTask 수정
    @Operation(summary = "SubTask 수정")
    @PatchMapping("/subtasks/{subtaskId}")
    public ResponseEntity<SubTaskResponse> updateSubTask(@PathVariable Long subtaskId,
        @Valid @RequestBody SubTaskUpdateRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(taskService.updateSubTask(subtaskId, request, userDetails.getUsername()));
    }

    // SubTask 순서 변경
    @Operation(summary = "SubTask 순서 변경")
    @PatchMapping("/subtasks/reorder")
    public ResponseEntity<Void> reorderSubTasks(@Valid @RequestBody SubTaskReorderRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

        taskService.reorderSubTasks(request, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // SubTask 삭제
    @Operation(summary = "SubTask 삭제")
    @DeleteMapping("/subtasks/{subtaskId}")
    public ResponseEntity<Void> deleteSubTask(@PathVariable Long subtaskId,
        @AuthenticationPrincipal UserDetails userDetails) {

        taskService.deleteSubTask(subtaskId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

}