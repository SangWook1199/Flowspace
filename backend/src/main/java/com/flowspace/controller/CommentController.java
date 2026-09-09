package com.flowspace.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.flowspace.dto.comment.CommentCreateRequest;
import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.dto.comment.CommentUpdateRequest;
import com.flowspace.service.CommentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class CommentController {

    private final CommentService commentService;

    // Task 댓글 작성
    @Operation(summary = "Task 댓글 작성")
    @PostMapping("/tasks/{taskId}/comments")
    public CommentResponse createTaskComment(@PathVariable Long taskId,
        @Valid @RequestBody CommentCreateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return commentService.createTaskComment(taskId, request, userDetails.getUsername());
    }

    // Task 댓글 목록 조회
    @Operation(summary = "Task 댓글 목록 조회")
    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentResponse> getTaskComments(@PathVariable Long taskId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return commentService.getTaskComments(taskId, userDetails.getUsername());
    }

    // Block 댓글 작성
    @Operation(summary = "Block 댓글 작성")
    @PostMapping("/blocks/{blockId}/comments")
    public CommentResponse createBlockComment(@PathVariable Long blockId,
        @Valid @RequestBody CommentCreateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return commentService.createBlockComment(blockId, request, userDetails.getUsername());
    }

    // Block 댓글 목록 조회
    @Operation(summary = "Block 댓글 목록 조회")
    @GetMapping("/blocks/{blockId}/comments")
    public List<CommentResponse> getBlockComments(@PathVariable Long blockId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return commentService.getBlockComments(blockId, userDetails.getUsername());
    }

    // 댓글 수정
    @Operation(summary = "댓글 수정")
    @PatchMapping("/comments/{commentId}")
    public CommentResponse updateComment(@PathVariable Long commentId, @Valid @RequestBody CommentUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return commentService.updateComment(commentId, request, userDetails.getUsername());
    }

    // 댓글 삭제
    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/comments/{commentId}")
    public void deleteComment(@PathVariable Long commentId, @AuthenticationPrincipal UserDetails userDetails) {
        commentService.deleteComment(commentId, userDetails.getUsername());
    }
}