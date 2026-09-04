package com.flowspace.dto.workspace;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.WorkspaceColor;
import com.flowspace.entity.enums.WorkspaceRole;

// @formatter:off

// 워크스페이스 응답 DTO
public record WorkspaceResponse(

        Long workspaceId,
        String name,
        String initials,
        WorkspaceColor color,
        Long ownerId,
        WorkspaceRole role
) {

    public static WorkspaceResponse from(
            Workspace workspace,
            WorkspaceRole role
    ) {
        return new WorkspaceResponse(
                workspace.getWorkspaceId(),
                workspace.getName(),
                workspace.getInitials(),
                workspace.getColor(),
                workspace.getOwner().getUserId(),
                role
        );
    }
}

// @formatter:on