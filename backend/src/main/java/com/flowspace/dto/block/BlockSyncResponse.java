package com.flowspace.dto.block;

import java.util.List;

// @formatter:off

// 블록 일괄 동기화 응답 DTO
public record BlockSyncResponse(

    List<BlockSyncResult> blocks,

    // 저장 뒤 페이지 버전 (다음 저장 때 baseVersion으로 보내요)
    Long version

) {

    public record BlockSyncResult(

        String clientId,
        BlockResponse block

    ) {
    }

}

// @formatter:on
