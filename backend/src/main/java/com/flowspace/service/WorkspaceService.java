package com.flowspace.service;

import com.flowspace.dto.workspace.WorkspaceCreateRequest;
import com.flowspace.dto.workspace.WorkspaceResponse;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    // 워크스페이스 생성
    public WorkspaceResponse createWorkspace(WorkspaceCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = Workspace.builder().owner(user).name(request.name()).initials(request.initials())
            .color(request.color()).build();

        workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder().workspace(workspace).user(user).role(WorkspaceRole.OWNER)
            .build();

        workspaceMemberRepository.save(member);

        user.updateLastWorkspace(workspace);

        return WorkspaceResponse.from(workspace);
    }

    // 내 워크스페이스 목록 조회
    @Transactional(readOnly = true)
    public List<WorkspaceResponse> getMyWorkspaces(String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        return workspaceMemberRepository.findByUser(user).stream().map(member -> member.getWorkspace())
            .map(WorkspaceResponse::from).toList();
    }

    // 워크스페이스 단건 조회
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspace(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return WorkspaceResponse.from(workspace);
    }
}