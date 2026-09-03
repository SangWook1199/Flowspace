package com.flowspace.dto.workspace;

import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.enums.InviteStatus;

// @formatter:off

// 워크스페이스 초대 응답 DTO
public record WorkspaceInviteResponse(

        Long inviteId,
        Long workspaceId,
        Long inviterId,
        String email,
        InviteStatus status
) {

    public static WorkspaceInviteResponse from(WorkspaceInvite invite) {
        return new WorkspaceInviteResponse(
                invite.getInviteId(),
                invite.getWorkspace().getWorkspaceId(),
                invite.getInviter().getUserId(),
                invite.getEmail(),
                invite.getStatus()
        );
    }
}

// @formatter:on