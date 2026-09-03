package com.flowspace.controller;

import com.flowspace.dto.task.TaskStatusCreateRequest;
import com.flowspace.dto.task.TaskStatusDeleteRequest;
import com.flowspace.dto.task.TaskStatusEditRequest;
import com.flowspace.dto.task.TaskStatusReorderRequest;
import com.flowspace.dto.task.TaskStatusResponse;
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

    // Task 상태 생성
    @Operation(summary = "Task 상태 생성")
    @PostMapping("/workspaces/{workspaceId}/task-statuses")
    public TaskStatusResponse createStatus(@PathVariable Long workspaceId,
        @Valid @RequestBody TaskStatusCreateRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.createStatus(workspaceId, request, userDetails.getUsername());
    }

    // Task 상태 목록 조회
    @Operation(summary = "Task 상태 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/task-statuses")
    public List<TaskStatusResponse> getStatuses(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.getStatuses(workspaceId, userDetails.getUsername());
    }

    // Task 상태 수정
    @Operation(summary = "Task 상태 수정")
    @PatchMapping("/task-statuses/{statusId}")
    public TaskStatusResponse updateStatusInfo(@PathVariable Long statusId,
        @Valid @RequestBody TaskStatusEditRequest request, @AuthenticationPrincipal UserDetails userDetails) {

        return taskService.updateStatusInfo(statusId, request, userDetails.getUsername());
    }

    // Task 상태 순서 변경
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
}