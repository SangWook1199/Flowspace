package com.flowspace.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.comment.CommentCreateRequest;
import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.dto.comment.CommentUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.Comment;
import com.flowspace.entity.Task;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.CommentRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final BlockRepository blockRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    // Task 댓글 작성
    public CommentResponse createTaskComment(Long taskId, CommentCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Comment parent = null;

        if (request.parentCommentId() != null) {
            parent = commentRepository.findById(request.parentCommentId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND));
        }

        Comment comment = Comment.builder().task(task).parentComment(parent).user(user).content(request.content())
            .build();

        commentRepository.save(comment);

        return CommentResponse.from(comment, List.of());
    }

    // Block 댓글 작성
    public CommentResponse createBlockComment(Long blockId, CommentCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Comment parent = null;

        if (request.parentCommentId() != null) {
            parent = commentRepository.findById(request.parentCommentId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND));
        }

        Comment comment = Comment.builder().block(block).parentComment(parent).user(user).content(request.content())
            .build();

        commentRepository.save(comment);

        return CommentResponse.from(comment, List.of());
    }

    // Task 댓글 목록 조회
    @Transactional(readOnly = true)
    public List<CommentResponse> getTaskComments(Long taskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return commentRepository.findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(task).stream()
            .map(this::toResponse).toList();
    }

    // Block 댓글 목록 조회
    @Transactional(readOnly = true)
    public List<CommentResponse> getBlockComments(Long blockId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return commentRepository.findByBlockAndParentCommentIsNullOrderByCreatedAtAsc(block).stream()
            .map(this::toResponse).toList();
    }

    // 댓글 수정
    public CommentResponse updateComment(Long commentId, CommentUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUser().getUserId().equals(user.getUserId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        comment.update(request.content());

        return CommentResponse.from(comment, List.of());
    }

    // 댓글 삭제
    public void deleteComment(Long commentId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUser().getUserId().equals(user.getUserId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        commentRepository.delete(comment);
    }

    // 대댓글 포함 댓글 변환
    private CommentResponse toResponse(Comment comment) {

        List<CommentResponse> replies = commentRepository.findByParentCommentOrderByCreatedAtAsc(comment).stream()
            .map(reply -> CommentResponse.from(reply, List.of())).toList();

        return CommentResponse.from(comment, replies);
    }
}
