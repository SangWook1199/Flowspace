package com.flowspace.dto.block;

import com.flowspace.entity.enums.BlockType;

// @formatter:off

// 블록 생성 요청 DTO
public record BlockCreateRequest(

    Long parentBlockId,

    BlockType type,

    String content,

    Long taskId,

    Long eventId

) {
}

// @formatter:on