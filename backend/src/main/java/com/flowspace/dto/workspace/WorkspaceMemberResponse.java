package com.flowspace.dto.workspace;

import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.WorkspaceRole;

// @formatter:off

// 워크스페이스 멤버 응답 DTO
public record WorkspaceMemberResponse(

    Long userId,
    String name,
    String nickname,
    Long profileFileId,
    WorkspaceRole role

) {

    public static WorkspaceMemberResponse from(WorkspaceMember member) {
        return new WorkspaceMemberResponse(
            member.getUser().getUserId(),
            member.getUser().getName(),
            member.getUser().getNickname(),
            member.getUser().getProfileFile() == null
                ? null
                : member.getUser().getProfileFile().getFileId(),
            member.getRole()
        );
    }

}

// @formatter:on