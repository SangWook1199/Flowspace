package com.flowspace.dto.workspace;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.WorkspaceColor;

// @formatter:off

// 워크스페이스 응답 DTO
public record WorkspaceResponse(

        Long workspaceId,
        String name,
        String initials,
        WorkspaceColor color,
        Long ownerId
) {

    public static WorkspaceResponse from(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getWorkspaceId(),
                workspace.getName(),
                workspace.getInitials(),
                workspace.getColor(),
                workspace.getOwner().getUserId()
            );
    }
}

// @formatter:on