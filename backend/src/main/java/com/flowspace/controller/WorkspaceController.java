package com.flowspace.controller;

import com.flowspace.dto.workspace.WorkspaceCreateRequest;
import com.flowspace.dto.workspace.WorkspaceResponse;
import com.flowspace.dto.workspace.WorkspaceInviteRequest;
import com.flowspace.dto.workspace.WorkspaceInviteResponse;
import com.flowspace.dto.workspace.InviteResponse;
import com.flowspace.service.WorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @Operation(summary = "워크스페이스 생성")
    @PostMapping
    public WorkspaceResponse createWorkspace(@Valid @RequestBody WorkspaceCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.createWorkspace(request, userDetails.getUsername());
    }

    @Operation(summary = "내 워크스페이스 목록 조회")
    @GetMapping
    public List<WorkspaceResponse> getMyWorkspaces(@AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.getMyWorkspaces(userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 조회")
    @GetMapping("/{workspaceId}")
    public WorkspaceResponse getWorkspace(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.getWorkspace(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 멤버 초대")
    @PostMapping("/{workspaceId}/invites")
    public WorkspaceInviteResponse inviteMember(@PathVariable Long workspaceId,
        @Valid @RequestBody WorkspaceInviteRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.inviteMember(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "내가 받은 초대 목록 조회")
    @GetMapping("/invites/me")
    public List<InviteResponse> getMyInvites(@AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.getMyInvites(userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 초대 수락")
    @PatchMapping("/invites/{inviteId}/accept")
    public void acceptInvite(@PathVariable Long inviteId, @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.acceptInvite(inviteId, userDetails.getUsername());
    }
}