package com.flowspace.service;

import com.flowspace.dto.workspace.InviteResponse;
import com.flowspace.dto.workspace.WorkspaceCreateRequest;
import com.flowspace.dto.workspace.WorkspaceInviteRequest;
import com.flowspace.dto.workspace.WorkspaceInviteResponse;
import com.flowspace.dto.workspace.WorkspaceMemberResponse;
import com.flowspace.dto.workspace.WorkspaceOwnerTransferRequest;
import com.flowspace.dto.workspace.WorkspaceResponse;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.InviteStatus;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceInviteRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkspaceService {

        private final WorkspaceRepository workspaceRepository;
        private final WorkspaceMemberRepository workspaceMemberRepository;
        private final UserRepository userRepository;
        private final WorkspaceInviteRepository workspaceInviteRepository;

        // 워크스페이스 생성
        public WorkspaceResponse createWorkspace(WorkspaceCreateRequest request, String email) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

                Workspace workspace = Workspace.builder().owner(user).name(request.name()).initials(request.initials())
                        .color(request.color()).build();

                workspaceRepository.save(workspace);

                WorkspaceMember member = WorkspaceMember.builder().workspace(workspace).user(user)
                        .role(WorkspaceRole.OWNER).build();

                workspaceMemberRepository.save(member);

                user.updateLastWorkspace(workspace);

                return WorkspaceResponse.from(workspace, WorkspaceRole.OWNER);
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

                return workspaceMemberRepository.findByWorkspace(workspace).stream().map(WorkspaceMemberResponse::from)
                        .toList();
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

                workspaceMemberRepository.delete(member);

                if (user.getLastWorkspace() != null && user.getLastWorkspace().getWorkspaceId().equals(workspaceId)) {
                        user.updateLastWorkspace(null);
                }
        }
}