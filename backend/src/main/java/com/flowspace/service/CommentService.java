package com.flowspace.service;

import java.util.ArrayList;
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
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.NotificationType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.CommentRepository;
import com.flowspace.repository.TaskAssigneeRepository;
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

    private final TaskAssigneeRepository taskAssigneeRepository;

    private final ActivityService activityService;
    private final NotificationService notificationService;

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

        activityService.log(task.getWorkspace(), user, ActivityType.COMMENT_CREATED, ActivityTargetType.COMMENT,
            comment.getCommentId());

        notifyTaskComment(task, comment, parent, user);

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

        activityService.log(block.getPage().getWorkspace(), user, ActivityType.COMMENT_CREATED,
            ActivityTargetType.COMMENT, comment.getCommentId());

        notifyBlockComment(block, comment, parent, user);

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

    // 작업 댓글 알림: 답글이면 원 댓글 작성자에게, 그 외엔 담당자 + 작업 만든 사람에게
    private void notifyTaskComment(Task task, Comment comment, Comment parent, User actor) {

        String link = NotificationService.taskLink(task);
        String preview = preview(comment.getContent());

        if (parent != null) {
            notificationService.send(parent.getUser(), actor, task.getWorkspace(), NotificationType.COMMENT_CREATED,
                actor.getNickname() + "님이 내 댓글에 답글을 남겼어요: " + preview, task.getTaskId(), link);
        }

        List<User> recipients = new ArrayList<>();

        taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task).forEach(a -> recipients.add(a.getUser()));
        recipients.add(task.getCreatedBy());

        // 답글을 받은 사람에게 같은 알림이 두 번 가지 않도록 제외
        if (parent != null) {
            recipients.removeIf(u -> u != null && u.getUserId().equals(parent.getUser().getUserId()));
        }

        notificationService.sendAll(recipients, actor, task.getWorkspace(), NotificationType.COMMENT_CREATED,
            actor.getNickname() + "님이 '" + task.getTitle() + "' 작업에 댓글을 남겼어요: " + preview, task.getTaskId(),
            link);
    }

    // 페이지 블록 댓글 알림: 답글이면 원 댓글 작성자에게, 그 외엔 페이지 만든 사람에게
    private void notifyBlockComment(Block block, Comment comment, Comment parent, User actor) {

        var page = block.getPage();
        String link = "/pages/" + page.getPageId();
        String preview = preview(comment.getContent());

        if (parent != null) {
            notificationService.send(parent.getUser(), actor, page.getWorkspace(), NotificationType.COMMENT_CREATED,
                actor.getNickname() + "님이 내 댓글에 답글을 남겼어요: " + preview, page.getPageId(), link);
        }

        if (parent == null || !page.getCreatedBy().getUserId().equals(parent.getUser().getUserId())) {
            notificationService.send(page.getCreatedBy(), actor, page.getWorkspace(), NotificationType.COMMENT_CREATED,
                actor.getNickname() + "님이 '" + page.getTitle() + "' 페이지에 댓글을 남겼어요: " + preview,
                page.getPageId(), link);
        }
    }

    // 알림에 보여줄 댓글 미리보기
    private String preview(String content) {

        if (content == null) {
            return "";
        }

        String oneLine = content.replaceAll("\\s+", " ").trim();

        return oneLine.length() > 40 ? oneLine.substring(0, 40) + "…" : oneLine;
    }

    // 대댓글 포함 댓글 변환
    private CommentResponse toResponse(Comment comment) {

        List<CommentResponse> replies = commentRepository.findByParentCommentOrderByCreatedAtAsc(comment).stream()
            .map(reply -> CommentResponse.from(reply, List.of())).toList();

        return CommentResponse.from(comment, replies);
    }
}
