package com.flowspace.dto.block;

import com.flowspace.entity.enums.BlockType;
import jakarta.validation.constraints.NotNull;

// @formatter:off

// 블록 수정 요청 DTO
public record BlockUpdateRequest(

    @NotNull(message = "블록 타입은 필수입니다.")
    BlockType type,

    String content

) {
}

// @formatter:on