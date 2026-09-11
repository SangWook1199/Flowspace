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
import com.flowspace.repository.ActivityRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

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

        return activityRepository.findByWorkspaceOrderByCreatedAtDesc(workspace, PageRequest.of(0, 7))
            .map(ActivityResponse::from).getContent();
    }

    // 전체 조회
    public ActivityPageResponse getActivities(Long workspaceId, Integer page, String email) {

        User user = getUser(email);
        Workspace workspace = getWorkspace(workspaceId);

        validateMember(workspace, user);

        Page<ActivityResponse> result = activityRepository
            .findByWorkspaceOrderByCreatedAtDesc(workspace, PageRequest.of(page, 20)).map(ActivityResponse::from);

        return ActivityPageResponse.from(result);
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