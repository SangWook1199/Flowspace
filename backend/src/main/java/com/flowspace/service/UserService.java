package com.flowspace.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.user.UserLookupResponse;
import com.flowspace.dto.user.UserLookupResponse.Status;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.InviteStatus;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceInviteRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;

    // 이메일이 정확히 같은 사용자를 찾아요(부분 일치로 사용자를 훑어볼 수 없게 한 명만, 정확히 일치할 때만).
    // workspaceId를 주면 그 워크스페이스 기준으로 이미 멤버인지·이미 초대했는지도 알려줘요(워크스페이스 멤버만 쓸 수 있어요).
    public Optional<UserLookupResponse> lookupByEmail(String email, Long workspaceId, String requesterEmail) {

        User requester = userRepository.findByEmail(requesterEmail)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = null;

        if (workspaceId != null) {
            workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

            workspaceMemberRepository.findByWorkspaceAndUser(workspace, requester)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
        }

        String target = email == null ? "" : email.trim();

        if (target.isEmpty()) {
            return Optional.empty();
        }

        Workspace targetWorkspace = workspace;

        return userRepository.findByEmail(target).map(found -> UserLookupResponse.of(found,
            resolveStatus(found, requester, targetWorkspace)));
    }

    private Status resolveStatus(User found, User requester, Workspace workspace) {

        if (found.getUserId().equals(requester.getUserId())) {
            return Status.SELF;
        }

        if (workspace == null) {
            return Status.AVAILABLE;
        }

        if (workspaceMemberRepository.existsByWorkspaceAndUser(workspace, found)) {
            return Status.MEMBER;
        }

        if (workspaceInviteRepository
            .findByWorkspaceAndEmailAndStatus(workspace, found.getEmail(), InviteStatus.PENDING).isPresent()) {
            return Status.INVITED;
        }

        return Status.AVAILABLE;
    }
}
