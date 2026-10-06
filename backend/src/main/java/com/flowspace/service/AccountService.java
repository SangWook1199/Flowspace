package com.flowspace.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.auth.WithdrawCheckResponse;
import com.flowspace.dto.auth.WithdrawCheckResponse.WorkspaceBrief;
import com.flowspace.dto.auth.WithdrawRequest;
import com.flowspace.entity.File;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.InviteStatus;
import com.flowspace.entity.enums.NotificationType;
import com.flowspace.entity.enums.Provider;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.NotificationRepository;
import com.flowspace.repository.PasswordResetTokenRepository;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserSocialAccountRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceInviteRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import com.flowspace.websocket.NotificationWebSocketHandler;

import lombok.RequiredArgsConstructor;

// 계정 관리 중에서 회원 탈퇴를 맡아요.
// 작업·댓글·활동 기록은 다른 멤버들에게도 필요해서 사용자 행을 지우지 않고 "탈퇴한 사용자"로 익명 처리해요(User.withdraw).
@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileService fileService;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler socketHandler;

    // 탈퇴하면 내 워크스페이스가 어떻게 되는지 미리 알려줘요.
    @Transactional(readOnly = true)
    public WithdrawCheckResponse checkWithdraw(String email) {

        User user = findUser(email);

        return classify(user).toResponse();
    }

    // 회원 탈퇴
    public void withdraw(WithdrawRequest request, String email) {

        User user = findUser(email);

        confirmIdentity(user, request);

        Classified classified = classify(user);

        // 다른 멤버가 있는 워크스페이스의 소유자는 먼저 소유권을 넘기거나 멤버를 내보내야 해요.
        if (!classified.blocking.isEmpty()) {
            throw new FlowSpaceException(ErrorCode.OWNED_WORKSPACE_HAS_MEMBERS);
        }

        // 프로필 사진 파일 삭제 (파일을 못 지워도 탈퇴는 진행해요)
        File profileFile = user.getProfileFile();

        if (profileFile != null) {
            user.removeProfileImage();

            try {
                fileService.delete(profileFile);
            } catch (FlowSpaceException ignored) {
            }
        }

        // 다른 사람의 워크스페이스에서는 나가고, 소유자에게 알려요.
        for (WorkspaceMember member : classified.leavingMembers) {
            Workspace workspace = member.getWorkspace();

            workspaceMemberRepository.delete(member);

            notificationService.send(workspace.getOwner(), user, workspace, NotificationType.MEMBER_LEFT,
                user.getNickname() + "님이 탈퇴하면서 '" + workspace.getName() + "' 워크스페이스를 나갔어요.", null, null);
        }

        user.updateLastWorkspace(null);

        // 나 혼자 쓰던 워크스페이스는 함께 삭제해요.
        for (Workspace workspace : classified.deleting) {
            // 작업이 남아 있으면 FK 때문에 삭제가 실패하므로 작업부터 지워요.
            taskRepository.deleteAllByWorkspace(workspace);
            workspaceRepository.delete(workspace);
        }

        taskAssigneeRepository.deleteByUser(user);
        notificationRepository.deleteByUser(user);
        refreshTokenRepository.deleteByUser(user);
        // 연결된 소셜 계정과 비밀번호 재설정 링크도 지워요(탈퇴한 계정으로 다시 로그인되지 않게).
        socialAccountRepository.deleteByUser(user);
        passwordResetTokenRepository.deleteByUser(user);

        // 이 이메일로 온 대기 중인 초대는 더 받을 사람이 없어요.
        workspaceInviteRepository.deleteAll(
            workspaceInviteRepository.findByEmailAndStatus(user.getEmail(), InviteStatus.PENDING));

        Long userId = user.getUserId();

        user.withdraw();

        // 커밋된 뒤에 열려 있는 모든 접속(탭)을 끊어요.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    socketHandler.disconnectUser(userId);
                }
            });
        } else {
            socketHandler.disconnectUser(userId);
        }
    }

    // 본인 확인: 이메일 가입 계정은 비밀번호, 소셜 계정은 계정 이메일을 그대로 입력하게 해요.
    private void confirmIdentity(User user, WithdrawRequest request) {

        if (user.getProvider() == Provider.LOCAL && user.getPassword() != null) {
            if (request.password() == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
                throw new FlowSpaceException(ErrorCode.INVALID_CURRENT_PASSWORD);
            }
            return;
        }

        if (request.confirmEmail() == null || !request.confirmEmail().trim().equalsIgnoreCase(user.getEmail())) {
            throw new FlowSpaceException(ErrorCode.WITHDRAW_CONFIRM_MISMATCH);
        }
    }

    private User findUser(String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        if (user.isWithdrawn()) {
            throw new FlowSpaceException(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    // 내 워크스페이스를 탈퇴 때의 처리 방식별로 나눠요.
    private Classified classify(User user) {

        Classified result = new Classified();

        for (WorkspaceMember member : workspaceMemberRepository.findByUser(user)) {
            Workspace workspace = member.getWorkspace();
            int memberCount = workspaceMemberRepository.findByWorkspace(workspace).size();

            if (member.getRole() == WorkspaceRole.OWNER) {
                if (memberCount > 1) {
                    result.blocking.add(workspace);
                } else {
                    result.deleting.add(workspace);
                }
            } else {
                result.leavingMembers.add(member);
            }

            result.counts.put(workspace.getWorkspaceId(), memberCount);
        }

        return result;
    }

    private class Classified {

        final List<Workspace> blocking = new ArrayList<>();
        final List<Workspace> deleting = new ArrayList<>();
        final List<WorkspaceMember> leavingMembers = new ArrayList<>();
        final java.util.Map<Long, Integer> counts = new java.util.HashMap<>();

        WithdrawCheckResponse toResponse() {
            return new WithdrawCheckResponse(blocking.isEmpty(), brief(blocking), brief(deleting),
                leavingMembers.stream().map(WorkspaceMember::getWorkspace).map(this::briefOf).toList());
        }

        private List<WorkspaceBrief> brief(List<Workspace> list) {
            return list.stream().map(this::briefOf).toList();
        }

        private WorkspaceBrief briefOf(Workspace workspace) {
            return new WorkspaceBrief(workspace.getWorkspaceId(), workspace.getName(),
                counts.getOrDefault(workspace.getWorkspaceId(), 1));
        }
    }
}
