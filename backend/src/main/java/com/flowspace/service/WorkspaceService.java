package com.flowspace.service;

import com.flowspace.dto.workspace.*;
import com.flowspace.entity.*;
import com.flowspace.entity.enums.*;
import com.flowspace.entity.id.WorkspaceTaskStatusId;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.*;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkspaceService {

        // 프로필 카드에 보여줄 담당 작업 최대 개수
        private static final int PROFILE_TASK_LIMIT = 5;

        private final WorkspaceRepository workspaceRepository;
        private final WorkspaceMemberRepository workspaceMemberRepository;
        private final UserRepository userRepository;
        private final WorkspaceInviteRepository workspaceInviteRepository;
        private final TaskStatusRepository taskStatusRepository;
        private final WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
        private final NotificationService notificationService;
        private final PresenceService presenceService;
        private final TaskAssigneeRepository taskAssigneeRepository;
        private final TaskRepository taskRepository;

        // 워크스페이스 생성
        public WorkspaceResponse createWorkspace(WorkspaceCreateRequest request, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = Workspace.builder().owner(user).name(request.name()).initials(request.initials())
                        .color(request.color()).icon(normalizeIcon(request.icon())).build();

                workspaceRepository.save(workspace);

                WorkspaceMember member = WorkspaceMember.builder().workspace(workspace).user(user)
                        .role(WorkspaceRole.OWNER).build();

                workspaceMemberRepository.save(member);

                // 공통 메서드 호출
                createDefaultStatuses(workspace);

                user.updateLastWorkspace(workspace);

                return WorkspaceResponse.from(workspace, WorkspaceRole.OWNER);
        }

        // 아이콘 값 정리: 비어 있으면 null(아이콘 없음), 아니면 앞뒤 공백을 지워요.
        private String normalizeIcon(String icon) {
                return icon == null || icon.isBlank() ? null : icon.trim();
        }

        // 워크스페이스 수정 (소유자만 가능)
        public WorkspaceResponse updateWorkspace(Long workspaceId, WorkspaceUpdateRequest request, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                if (member.getRole() != WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                workspace.update(request.name().trim(), request.initials().trim(), request.color(),
                        normalizeIcon(request.icon()));

                return WorkspaceResponse.from(workspace, member.getRole());
        }

        // 개인 워크스페이스 생성 (회원가입 전용)
        public Workspace createPersonalWorkspace(User user) {

                Workspace workspace = Workspace.builder().owner(user).name(user.getNickname() + "의 워크스페이스")
                        .initials(user.getNickname().substring(0, 1)).color(WorkspaceColor.BLUE).build();

                workspaceRepository.save(workspace);

                workspaceMemberRepository.save(
                        WorkspaceMember.builder().workspace(workspace).user(user).role(WorkspaceRole.OWNER).build());

                createDefaultStatuses(workspace);

                user.updateLastWorkspace(workspace);

                return workspace;
        }

        // 기본 Task 상태 생성
        private void createDefaultStatuses(Workspace workspace) {

                TaskStatus todo = taskStatusRepository.findById(1L)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

                TaskStatus inProgress = taskStatusRepository.findById(2L)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

                TaskStatus done = taskStatusRepository.findById(3L)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_STATUS_NOT_FOUND));

                workspaceTaskStatusRepository.saveAll(List.of(

                        WorkspaceTaskStatus.builder().id(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), 1L))
                                .workspace(workspace).taskStatus(todo).position(0).isDefault(true).build(),

                        WorkspaceTaskStatus.builder().id(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), 2L))
                                .workspace(workspace).taskStatus(inProgress).position(1).isDefault(true).build(),

                        WorkspaceTaskStatus.builder().id(new WorkspaceTaskStatusId(workspace.getWorkspaceId(), 3L))
                                .workspace(workspace).taskStatus(done).position(2).isDefault(true).build()));
        }

        // 내 워크스페이스 목록 조회
        @Transactional(readOnly = true)
        public List<WorkspaceResponse> getMyWorkspaces(String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                return workspaceMemberRepository.findByUser(user).stream()
                        .map(member -> WorkspaceResponse.from(member.getWorkspace(), member.getRole())).toList();
        }

        // 워크스페이스 단건 조회
        @Transactional(readOnly = true)
        public WorkspaceResponse getWorkspace(Long workspaceId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                return WorkspaceResponse.from(workspace, member.getRole());
        }

        // 워크스페이스 멤버 초대
        public WorkspaceInviteResponse inviteMember(Long workspaceId, WorkspaceInviteRequest request, String email) {

                User inviter = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                workspaceMemberRepository.findByWorkspaceAndUser(workspace, inviter)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                User invitee = userRepository.findByEmail(request.email())
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                if (workspaceMemberRepository.existsByWorkspaceAndUser(workspace, invitee)) {
                        throw new FlowSpaceException(ErrorCode.ALREADY_WORKSPACE_MEMBER);
                }

                workspaceInviteRepository
                        .findByWorkspaceAndEmailAndStatus(workspace, request.email(), InviteStatus.PENDING)
                        .ifPresent(invite -> {
                                throw new FlowSpaceException(ErrorCode.ALREADY_INVITED);
                        });

                WorkspaceInvite invite = WorkspaceInvite.builder().workspace(workspace).inviter(inviter)
                        .email(request.email()).status(InviteStatus.PENDING).build();

                workspaceInviteRepository.save(invite);

                // 초대받은 사람에게 알림 (알림창에서 바로 수락/거절할 수 있어요)
                notificationService.send(invitee, inviter, workspace, NotificationType.WORKSPACE_INVITE,
                        inviter.getNickname() + "님이 '" + workspace.getName() + "' 워크스페이스에 초대했어요.",
                        invite.getInviteId(), null);

                return WorkspaceInviteResponse.from(invite);
        }

        // 내가 받은 초대 목록 조회
        @Transactional(readOnly = true)
        public List<InviteResponse> getMyInvites(String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                return workspaceInviteRepository.findByEmailAndStatus(user.getEmail(), InviteStatus.PENDING).stream()
                        .map(InviteResponse::from).toList();
        }

        // 워크스페이스 초대 수락
        public void acceptInvite(Long inviteId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                WorkspaceInvite invite = workspaceInviteRepository.findById(inviteId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVITE_NOT_FOUND));

                if (!invite.getEmail().equals(user.getEmail())) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                if (invite.getStatus() != InviteStatus.PENDING) {
                        throw new FlowSpaceException(ErrorCode.INVALID_INVITE_STATUS);
                }

                WorkspaceMember member = WorkspaceMember.builder().workspace(invite.getWorkspace()).user(user)
                        .role(WorkspaceRole.MEMBER).build();

                workspaceMemberRepository.save(member);

                invite.accept();
                user.updateLastWorkspace(invite.getWorkspace());

                // 받은 초대 알림은 읽음 처리하고, 초대한 사람에게 수락했다고 알려요.
                notificationService.markReadByRef(user, NotificationType.WORKSPACE_INVITE, invite.getInviteId());
                notificationService.send(invite.getInviter(), user, invite.getWorkspace(),
                        NotificationType.INVITE_ACCEPTED,
                        user.getNickname() + "님이 '" + invite.getWorkspace().getName() + "' 초대를 수락했어요.",
                        invite.getInviteId(), null);
        }

        // 워크스페이스 초대 거절
        public void declineInvite(Long inviteId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                WorkspaceInvite invite = workspaceInviteRepository.findById(inviteId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVITE_NOT_FOUND));

                if (!invite.getEmail().equals(user.getEmail())) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                if (invite.getStatus() != InviteStatus.PENDING) {
                        throw new FlowSpaceException(ErrorCode.INVALID_INVITE_STATUS);
                }

                invite.decline();

                notificationService.markReadByRef(user, NotificationType.WORKSPACE_INVITE, invite.getInviteId());
                notificationService.send(invite.getInviter(), user, invite.getWorkspace(),
                        NotificationType.INVITE_DECLINED,
                        user.getNickname() + "님이 '" + invite.getWorkspace().getName() + "' 초대를 거절했어요.",
                        invite.getInviteId(), null);
        }

        // 워크스페이스 멤버 목록 조회
        @Transactional(readOnly = true)
        public List<WorkspaceMemberResponse> getMembers(Long workspaceId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                return workspaceMemberRepository.findByWorkspace(workspace).stream()
                        .map(member -> WorkspaceMemberResponse.from(member,
                                presenceService.isOnline(member.getUser().getUserId())))
                        .toList();
        }

        // 멤버 프로필 카드 조회 (같은 워크스페이스 멤버끼리만 볼 수 있고, 이 워크스페이스 안의 정보만 보여줘요)
        @Transactional(readOnly = true)
        public MemberProfileResponse getMemberProfile(Long workspaceId, Long userId, String email) {

                User viewer = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                workspaceMemberRepository.findByWorkspaceAndUser(workspace, viewer)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                User target = userRepository.findById(userId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, target)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.MEMBER_NOT_FOUND));

                List<MemberProfileResponse.TaskItem> tasks = taskAssigneeRepository
                        .findOpenTasks(target, workspace, TaskStatusCategory.DONE, PageRequest.of(0, PROFILE_TASK_LIMIT))
                        .stream().map(MemberProfileResponse.TaskItem::from).toList();

                return new MemberProfileResponse(target.getUserId(), target.getNickname(), target.getEmail(),
                        target.getBio(),
                        target.getProfileFile() == null ? null : target.getProfileFile().getFileUrl(),
                        member.getRole(), member.getJoinedAt(), presenceService.isOnline(target.getUserId()),
                        target.getLastActiveAt(),
                        taskAssigneeRepository.countOpen(target, workspace, TaskStatusCategory.DONE),
                        taskAssigneeRepository.countDone(target, workspace, TaskStatusCategory.DONE), tasks);
        }

        // 워크스페이스 소유권 이전
        public void transferOwnership(Long workspaceId, WorkspaceOwnerTransferRequest request, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember owner = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                if (owner.getRole() != WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                User targetUser = userRepository.findById(request.userId())
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                WorkspaceMember targetMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, targetUser)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                owner.changeRole(WorkspaceRole.MEMBER);
                targetMember.changeRole(WorkspaceRole.OWNER);

                workspace.changeOwner(targetUser);

                notificationService.send(targetUser, user, workspace, NotificationType.OWNERSHIP_TRANSFERRED,
                        user.getNickname() + "님이 '" + workspace.getName() + "'의 소유권을 넘겼어요. 이제 내가 소유자예요.", null,
                        null);
        }

        // 워크스페이스 삭제
        public void deleteWorkspace(Long workspaceId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                if (member.getRole() != WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                // 내가 속한 워크스페이스가 이것 하나뿐이면 삭제할 수 없어요(앱을 쓸 곳이 없어져요).
                if (workspaceMemberRepository.findByUser(user).size() <= 1) {
                        throw new FlowSpaceException(ErrorCode.LAST_WORKSPACE);
                }

                // 작업이 남아 있으면 FK 때문에 삭제가 실패하므로 작업부터 지워요.
                taskRepository.deleteAllByWorkspace(workspace);

                workspaceRepository.delete(workspace);
        }

        // 워크스페이스 멤버 추방
        public void removeMember(Long workspaceId, Long userId, String email) {

                User loginUser = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember owner = workspaceMemberRepository.findByWorkspaceAndUser(workspace, loginUser)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                if (owner.getRole() != WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }

                User targetUser = userRepository.findById(userId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                WorkspaceMember targetMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, targetUser)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.MEMBER_NOT_FOUND));

                if (targetMember.getRole() == WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.OWNER_CANNOT_REMOVE);
                }

                workspaceMemberRepository.delete(targetMember);

                notificationService.send(targetUser, loginUser, workspace, NotificationType.MEMBER_REMOVED,
                        "'" + workspace.getName() + "' 워크스페이스에서 내보내졌어요.", null, null);
        }

        // 워크스페이스 나가기
        public void leaveWorkspace(Long workspaceId, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = workspaceRepository.findById(workspaceId)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

                WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

                if (member.getRole() == WorkspaceRole.OWNER) {
                        throw new FlowSpaceException(ErrorCode.OWNER_CANNOT_LEAVE);
                }

                // 내가 속한 워크스페이스가 이것 하나뿐이면 나갈 수 없어요.
                if (workspaceMemberRepository.findByUser(user).size() <= 1) {
                        throw new FlowSpaceException(ErrorCode.LAST_WORKSPACE);
                }

                workspaceMemberRepository.delete(member);

                // 소유자에게 멤버가 나갔다고 알려요.
                notificationService.send(workspace.getOwner(), user, workspace, NotificationType.MEMBER_LEFT,
                        user.getNickname() + "님이 '" + workspace.getName() + "' 워크스페이스를 나갔어요.", null, null);

                if (user.getLastWorkspace() != null && user.getLastWorkspace().getWorkspaceId().equals(workspaceId)) {
                        user.updateLastWorkspace(null);
                }
        }
}