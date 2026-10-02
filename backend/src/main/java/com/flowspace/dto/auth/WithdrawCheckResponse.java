package com.flowspace.dto.auth;

import java.util.List;

// @formatter:off

// 탈퇴하면 내 워크스페이스가 어떻게 되는지 미리 알려주는 응답 DTO
//  - blocking: 다른 멤버가 있는 내 워크스페이스 (소유권을 넘기거나 멤버를 내보내야 탈퇴할 수 있어요)
//  - deleting: 나 혼자 쓰는 내 워크스페이스 (탈퇴하면 함께 삭제돼요)
//  - leaving: 내가 멤버로 들어가 있는 다른 사람의 워크스페이스 (탈퇴하면 자동으로 나가요)
public record WithdrawCheckResponse(

    boolean canWithdraw,
    List<WorkspaceBrief> blocking,
    List<WorkspaceBrief> deleting,
    List<WorkspaceBrief> leaving

) {

    public record WorkspaceBrief(

        Long workspaceId,
        String name,
        int memberCount

    ) {}
}

// @formatter:on
