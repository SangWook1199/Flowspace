package com.flowspace.controller;

import com.flowspace.dto.workspace.WorkspaceCreateRequest;
import com.flowspace.dto.workspace.WorkspaceUpdateRequest;
import com.flowspace.dto.workspace.WorkspaceResponse;
import com.flowspace.dto.workspace.WorkspaceInviteRequest;
import com.flowspace.dto.workspace.WorkspaceInviteResponse;
import com.flowspace.dto.workspace.InviteResponse;
import com.flowspace.dto.workspace.MemberProfileResponse;
import com.flowspace.dto.workspace.WorkspaceMemberResponse;
import com.flowspace.dto.workspace.WorkspaceOwnerTransferRequest;
import com.flowspace.dto.workspace.WorkspaceRoleChangeRequest;
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

    @Operation(summary = "워크스페이스 수정", description = "소유자만 이름·이니셜·색·아이콘을 수정할 수 있습니다. icon을 비우면 아이콘이 지워집니다.")
    @PatchMapping("/{workspaceId}")
    public WorkspaceResponse updateWorkspace(@PathVariable Long workspaceId,
        @Valid @RequestBody WorkspaceUpdateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.updateWorkspace(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 멤버 초대", description = "관리자 이상만 초대할 수 있습니다.")
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

    @Operation(summary = "워크스페이스 초대 거절")
    @PatchMapping("/invites/{inviteId}/decline")
    public void declineInvite(@PathVariable Long inviteId, @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.declineInvite(inviteId, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 멤버 목록 조회")
    @GetMapping("/{workspaceId}/members")
    public List<WorkspaceMemberResponse> getMembers(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.getMembers(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "멤버 프로필 카드 조회", description = "같은 워크스페이스 멤버만 볼 수 있고, 이 워크스페이스 안에서 맡은 작업 요약을 함께 반환합니다.")
    @GetMapping("/{workspaceId}/members/{userId}")
    public MemberProfileResponse getMemberProfile(@PathVariable Long workspaceId, @PathVariable Long userId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.getMemberProfile(workspaceId, userId, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 소유권 이전")
    @PatchMapping("/{workspaceId}/owner")
    public void transferOwnership(@PathVariable Long workspaceId,
        @Valid @RequestBody WorkspaceOwnerTransferRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.transferOwnership(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 삭제", description = "소유자만 가능하며, 내가 속한 마지막 워크스페이스는 삭제할 수 없습니다.")
    @DeleteMapping("/{workspaceId}")
    public void deleteWorkspace(@PathVariable Long workspaceId, @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.deleteWorkspace(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 멤버 역할 변경", description = "소유자만 멤버를 관리자(ADMIN)로 올리거나 일반 멤버(MEMBER)로 내릴 수 있습니다. 소유자 자리는 소유권 이전으로만 바뀝니다.")
    @PatchMapping("/{workspaceId}/members/{userId}/role")
    public WorkspaceMemberResponse changeMemberRole(@PathVariable Long workspaceId, @PathVariable Long userId,
        @Valid @RequestBody WorkspaceRoleChangeRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return workspaceService.changeMemberRole(workspaceId, userId, request, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 멤버 추방", description = "관리자 이상만 가능하며, 관리자는 일반 멤버만 내보낼 수 있습니다.")
    @DeleteMapping("/{workspaceId}/members/{userId}")
    public void removeMember(@PathVariable Long workspaceId, @PathVariable Long userId,
        @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.removeMember(workspaceId, userId, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 나가기", description = "소유자는 나갈 수 없고, 내가 속한 마지막 워크스페이스에서도 나갈 수 없습니다.")
    @DeleteMapping("/{workspaceId}/leave")
    public void leaveWorkspace(@PathVariable Long workspaceId, @AuthenticationPrincipal UserDetails userDetails) {
        workspaceService.leaveWorkspace(workspaceId, userDetails.getUsername());
    }
}