package com.flowspace.dto.block;

import java.util.List;

// @formatter:off

// 블록 일괄 동기화 응답 DTO
public record BlockSyncResponse(

    List<BlockSyncResult> blocks

) {

    public record BlockSyncResult(

        String clientId,
        BlockResponse block

    ) {
    }

}

// @formatter:on
