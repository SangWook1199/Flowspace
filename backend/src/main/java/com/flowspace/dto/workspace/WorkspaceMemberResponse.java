package com.flowspace.dto.workspace;

import java.time.LocalDateTime;

import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.WorkspaceRole;

// @formatter:off

// 워크스페이스 멤버 응답 DTO (online: 지금 접속 중인지, lastActiveAt: 마지막으로 접속해 있던 시각 — 없으면 null)
public record WorkspaceMemberResponse(

    Long userId,
    String name,
    String nickname,
    Long profileFileId,
    String profileImageUrl,
    WorkspaceRole role,
    boolean online,
    LocalDateTime lastActiveAt

) {

    public static WorkspaceMemberResponse from(WorkspaceMember member, boolean online) {
        return new WorkspaceMemberResponse(
            member.getUser().getUserId(),
            member.getUser().getNickname(),
            member.getUser().getNickname(),
            member.getUser().getProfileFile() == null
                ? null
                : member.getUser().getProfileFile().getFileId(),
            member.getUser().getProfileFile() == null
                ? null
                : member.getUser().getProfileFile().getFileUrl(),
            member.getRole(),
            online,
            member.getUser().getLastActiveAt()
        );
    }

}

// @formatter:on