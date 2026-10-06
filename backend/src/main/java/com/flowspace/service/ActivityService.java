package com.flowspace.service;

import com.flowspace.dto.activity.ActivityPageResponse;
import com.flowspace.dto.activity.ActivityResponse;
import com.flowspace.entity.Activity;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.entity.Comment;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.repository.ActivityRepository;
import com.flowspace.repository.CommentRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final PageRepository pageRepository;
    private final CommentRepository commentRepository;

    // 활동 기록 화면의 종류 필터 → 실제 활동 종류들
    private static final Map<String, List<ActivityType>> CATEGORY_TYPES = Map.of(
        "PAGE", List.of(ActivityType.PAGE_CREATED),
        "TASK", List.of(ActivityType.TASK_CREATED, ActivityType.TASK_COMPLETED),
        "COMMENT", List.of(ActivityType.COMMENT_CREATED),
        "SPRINT", List.of(ActivityType.SPRINT_CREATED, ActivityType.SPRINT_COMPLETED));

    // 활동 로그 저장
    @Transactional
    public void log(Workspace workspace, User user, ActivityType type, ActivityTargetType targetType, Long targetId) {

        activityRepository.save(Activity.builder().workspace(workspace).user(user).type(type).targetType(targetType)
            .targetId(targetId).build());
    }

    // 최근 7개 조회
    public List<ActivityResponse> getRecentActivities(Long workspaceId, String email) {

        User user = getUser(email);
        Workspace workspace = getWorkspace(workspaceId);

        validateMember(workspace, user);

        return toResponses(activityRepository.findByWorkspaceOrderByCreatedAtDesc(workspace, PageRequest.of(0, 7))
            .getContent());
    }

    // 전체 조회 (category: PAGE | TASK | COMMENT | SPRINT, userId: 한 사람의 활동만 — 둘 다 비우면 전체)
    public ActivityPageResponse getActivities(Long workspaceId, Integer page, String category, Long userId,
        String email) {

        User viewer = getUser(email);
        Workspace workspace = getWorkspace(workspaceId);

        validateMember(workspace, viewer);

        Pageable pageable = PageRequest.of(Math.max(page == null ? 0 : page, 0), 20);

        // 모르는 종류가 오면 걸러내지 않고 전체를 보여줘요.
        List<ActivityType> types = category == null ? null : CATEGORY_TYPES.get(category);

        User target = userId == null ? null
            : userRepository.findById(userId).orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page<Activity> result;

        if (target != null && types != null) {
            result = activityRepository.findByUserAndTypes(workspace, target, types, pageable);
        } else if (target != null) {
            result = activityRepository.findByUser(workspace, target, pageable);
        } else if (types != null) {
            result = activityRepository.findByTypes(workspace, types, pageable);
        } else {
            result = activityRepository.findByWorkspaceOrderByCreatedAtDesc(workspace, pageable);
        }

        return ActivityPageResponse.from(new org.springframework.data.domain.PageImpl<>(toResponses(result.getContent()),
            pageable, result.getTotalElements()));
    }

    // 활동 목록에 대상의 현재 이름·이동 경로를 붙여요 (종류별로 한 번에 모아 조회해서 쿼리를 아껴요).
    private List<ActivityResponse> toResponses(List<Activity> activities) {

        Set<Long> taskIds = new HashSet<>();
        Set<Long> sprintIds = new HashSet<>();
        Set<Long> pageIds = new HashSet<>();
        Set<Long> commentIds = new HashSet<>();

        for (Activity activity : activities) {
            Set<Long> bucket = switch (activity.getTargetType()) {
                case TASK -> taskIds;
                case SPRINT -> sprintIds;
                case PAGE -> pageIds;
                case COMMENT -> commentIds;
                default -> null;
            };

            if (bucket != null) {
                bucket.add(activity.getTargetId());
            }
        }

        Map<Long, Task> tasks = byId(taskRepository.findAllById(taskIds), Task::getTaskId);
        Map<Long, Sprint> sprints = byId(sprintRepository.findAllById(sprintIds), Sprint::getSprintId);
        Map<Long, com.flowspace.entity.Page> pages = byId(pageRepository.findAllById(pageIds),
            com.flowspace.entity.Page::getPageId);
        Map<Long, Comment> comments = byId(commentRepository.findAllById(commentIds), Comment::getCommentId);

        return activities.stream().map(activity -> {
            Long id = activity.getTargetId();
            String name = null;
            String link = null;

            switch (activity.getTargetType()) {
                case TASK -> {
                    Task task = tasks.get(id);
                    if (task != null) {
                        name = task.getTitle();
                        link = NotificationService.taskLink(task);
                    }
                }
                case SPRINT -> {
                    Sprint sprint = sprints.get(id);
                    if (sprint != null) {
                        name = sprint.getName();
                        link = "/sprints/" + sprint.getSprintId();
                    }
                }
                case PAGE -> {
                    com.flowspace.entity.Page page = pages.get(id);
                    if (page != null) {
                        name = page.getTitle();
                        link = Boolean.TRUE.equals(page.getIsDeleted()) ? null : "/pages/" + page.getPageId();
                    }
                }
                case COMMENT -> {
                    // 댓글은 달린 작업(또는 페이지)의 이름과 경로를 보여줘요.
                    Comment comment = comments.get(id);
                    if (comment != null && comment.getTask() != null) {
                        name = comment.getTask().getTitle();
                        link = NotificationService.taskLink(comment.getTask());
                    } else if (comment != null && comment.getBlock() != null) {
                        com.flowspace.entity.Page page = comment.getBlock().getPage();
                        name = page.getTitle();
                        link = Boolean.TRUE.equals(page.getIsDeleted()) ? null : "/pages/" + page.getPageId();
                    }
                }
                default -> {
                }
            }

            return ActivityResponse.from(activity, name, link);
        }).toList();
    }

    private <T> Map<Long, T> byId(Collection<T> items, java.util.function.Function<T, Long> idOf) {
        Map<Long, T> map = new HashMap<>();
        items.forEach(item -> map.put(idOf.apply(item), item));
        return map;
    }

    // ---------- 공통 ----------

    private User getUser(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));
    }

    private Workspace getWorkspace(Long workspaceId) {
        return workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));
    }

    private void validateMember(Workspace workspace, User user) {
        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
    }
}