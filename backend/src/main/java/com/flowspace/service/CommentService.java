package com.flowspace.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

        Comment parent = resolveParent(request.parentCommentId(), task, null);

        Comment comment = Comment.builder().task(task).parentComment(parent).user(user).content(request.content())
            .build();

        commentRepository.save(comment);

        activityService.log(task.getWorkspace(), user, ActivityType.COMMENT_CREATED, ActivityTargetType.COMMENT,
            comment.getCommentId());

        Set<Long> mentioned = notifyMentions(comment, task.getWorkspace(), Set.of(), user, task.getTaskId(),
            NotificationService.taskLink(task));

        notifyTaskComment(task, comment, parent, user, mentioned);

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

        Comment parent = resolveParent(request.parentCommentId(), null, block);

        Comment comment = Comment.builder().block(block).parentComment(parent).user(user).content(request.content())
            .build();

        commentRepository.save(comment);

        activityService.log(block.getPage().getWorkspace(), user, ActivityType.COMMENT_CREATED,
            ActivityTargetType.COMMENT, comment.getCommentId());

        Set<Long> mentioned = notifyMentions(comment, block.getPage().getWorkspace(), Set.of(), user,
            block.getPage().getPageId(), "/pages/" + block.getPage().getPageId());

        notifyBlockComment(block, comment, parent, user, mentioned);

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

        // 수정하면서 새로 멘션된 사람에게만 알려요(원래 멘션돼 있던 사람에게 또 보내지 않아요).
        Set<Long> alreadyMentioned = MentionParser.extractUserIds(comment.getContent());

        comment.update(request.content());

        if (comment.getTask() != null) {
            Task task = comment.getTask();
            notifyMentions(comment, task.getWorkspace(), alreadyMentioned, user, task.getTaskId(),
                NotificationService.taskLink(task));
        } else if (comment.getBlock() != null) {
            var page = comment.getBlock().getPage();
            notifyMentions(comment, page.getWorkspace(), alreadyMentioned, user, page.getPageId(),
                "/pages/" + page.getPageId());
        }

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
    // 이미 멘션 알림을 받은 사람(mentioned)에게는 같은 댓글의 다른 알림을 또 보내지 않아요.
    private void notifyTaskComment(Task task, Comment comment, Comment parent, User actor, Set<Long> mentioned) {

        String link = NotificationService.taskLink(task);
        String preview = preview(comment.getContent());

        if (parent != null && !mentioned.contains(parent.getUser().getUserId())) {
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

        // 멘션 알림을 받은 사람 제외
        recipients.removeIf(u -> u != null && mentioned.contains(u.getUserId()));

        notificationService.sendAll(recipients, actor, task.getWorkspace(), NotificationType.COMMENT_CREATED,
            actor.getNickname() + "님이 '" + task.getTitle() + "' 작업에 댓글을 남겼어요: " + preview, task.getTaskId(),
            link);
    }

    // 페이지 블록 댓글 알림: 답글이면 원 댓글 작성자에게, 그 외엔 페이지 만든 사람에게
    private void notifyBlockComment(Block block, Comment comment, Comment parent, User actor, Set<Long> mentioned) {

        var page = block.getPage();
        String link = "/pages/" + page.getPageId();
        String preview = preview(comment.getContent());

        if (parent != null && !mentioned.contains(parent.getUser().getUserId())) {
            notificationService.send(parent.getUser(), actor, page.getWorkspace(), NotificationType.COMMENT_CREATED,
                actor.getNickname() + "님이 내 댓글에 답글을 남겼어요: " + preview, page.getPageId(), link);
        }

        boolean creatorAlreadyNotified = mentioned.contains(page.getCreatedBy().getUserId())
            || (parent != null && page.getCreatedBy().getUserId().equals(parent.getUser().getUserId()));

        if (!creatorAlreadyNotified) {
            notificationService.send(page.getCreatedBy(), actor, page.getWorkspace(), NotificationType.COMMENT_CREATED,
                actor.getNickname() + "님이 '" + page.getTitle() + "' 페이지에 댓글을 남겼어요: " + preview,
                page.getPageId(), link);
        }
    }

    // 댓글에서 멘션된 워크스페이스 멤버에게 알림을 보내고, 알림을 보낸 대상(본인 제외 여부와 무관하게 멘션된 멤버)의 id를 돌려줘요.
    // skip: 이미 멘션돼 있던 사람(수정할 때) — 알리지 않아요. 워크스페이스 멤버가 아닌 id는 무시해요.
    private Set<Long> notifyMentions(Comment comment, com.flowspace.entity.Workspace workspace, Set<Long> skip,
        User actor, Long refId, String link) {

        Set<Long> ids = new HashSet<>(MentionParser.extractUserIds(comment.getContent()));

        if (ids.isEmpty()) {
            return ids;
        }

        Set<Long> mentionedMembers = new HashSet<>();
        String preview = preview(comment.getContent());

        for (User target : userRepository.findAllById(ids)) {

            if (!workspaceMemberRepository.existsByWorkspaceAndUser(workspace, target)) {
                continue;
            }

            mentionedMembers.add(target.getUserId());

            if (!skip.contains(target.getUserId())) {
                notificationService.send(target, actor, workspace, NotificationType.COMMENT_MENTION,
                    actor.getNickname() + "님이 댓글에서 회원님을 언급했어요: " + preview, refId, link);
            }
        }

        return mentionedMembers;
    }

    // 알림에 보여줄 댓글 미리보기
    private String preview(String content) {

        if (content == null) {
            return "";
        }

        // 멘션은 "@[이름](id)" 대신 "@이름"으로 풀어서 보여줘요.
        String oneLine = MentionParser.toPlain(content).replaceAll("\\s+", " ").trim();

        return oneLine.length() > 40 ? oneLine.substring(0, 40) + "…" : oneLine;
    }

    // 대댓글 포함 댓글 변환
    private CommentResponse toResponse(Comment comment) {

        List<CommentResponse> replies = commentRepository.findByParentCommentOrderByCreatedAtAsc(comment).stream()
            .map(reply -> CommentResponse.from(reply, List.of())).toList();

        return CommentResponse.from(comment, replies);
    }

    // 답글의 부모 댓글을 확인해요.
    //  - 같은 작업(또는 같은 블록)의 댓글이어야 해요(다른 곳의 댓글을 부모로 지정하면 그쪽에 답글이 붙고 알림이 가요).
    //  - 답글에 단 답글은 그 위의 댓글에 이어 붙여요(댓글은 한 단계 답글까지만 보여줘서, 안 그러면 화면에서 사라져요).
    private Comment resolveParent(Long parentCommentId, Task task, Block block) {

        if (parentCommentId == null) {
            return null;
        }

        Comment parent = commentRepository.findById(parentCommentId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND));

        boolean sameTarget = task != null
            ? parent.getTask() != null && parent.getTask().getTaskId().equals(task.getTaskId())
            : parent.getBlock() != null && parent.getBlock().getBlockId().equals(block.getBlockId());

        if (!sameTarget) {
            throw new FlowSpaceException(ErrorCode.COMMENT_NOT_FOUND);
        }

        return parent.getParentComment() != null ? parent.getParentComment() : parent;
    }
}
