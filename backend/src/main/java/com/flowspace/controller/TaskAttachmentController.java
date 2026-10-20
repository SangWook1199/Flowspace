package com.flowspace.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.task.TaskAttachmentPageRequest;
import com.flowspace.dto.task.TaskAttachmentResponse;
import com.flowspace.service.TaskAttachmentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class TaskAttachmentController {

    private final TaskAttachmentService taskAttachmentService;

    @Operation(summary = "Task 관련 문서 목록 조회")
    @GetMapping("/tasks/{taskId}/attachments")
    public List<TaskAttachmentResponse> getAttachments(@PathVariable Long taskId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return taskAttachmentService.getAttachments(taskId, userDetails.getUsername());
    }

    @Operation(summary = "Task 관련 문서에 페이지 연결")
    @PostMapping("/tasks/{taskId}/attachments/pages")
    public TaskAttachmentResponse addPage(@PathVariable Long taskId,
        @Valid @RequestBody TaskAttachmentPageRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return taskAttachmentService.addPage(taskId, request, userDetails.getUsername());
    }

    @Operation(summary = "Task 관련 문서 파일 업로드")
    @PostMapping("/tasks/{taskId}/attachments/files")
    public TaskAttachmentResponse addFile(@PathVariable Long taskId, @RequestParam("file") MultipartFile file,
        @AuthenticationPrincipal UserDetails userDetails) {
        return taskAttachmentService.addFile(taskId, file, userDetails.getUsername());
    }

    @Operation(summary = "Task 관련 문서 삭제")
    @DeleteMapping("/tasks/{taskId}/attachments/{attachmentId}")
    public void deleteAttachment(@PathVariable Long taskId, @PathVariable Long attachmentId,
        @AuthenticationPrincipal UserDetails userDetails) {
        taskAttachmentService.deleteAttachment(taskId, attachmentId, userDetails.getUsername());
    }
}
