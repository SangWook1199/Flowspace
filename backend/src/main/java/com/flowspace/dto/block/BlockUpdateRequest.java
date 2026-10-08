package com.flowspace.dto.block;

import com.flowspace.entity.enums.BlockType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// 블록 수정 요청 DTO
public record BlockUpdateRequest(

    @NotNull(message = "블록 타입은 필수입니다.")
    BlockType type,

    @Size(max = 500000, message = "블록 내용이 너무 큽니다.")
    String content

) {
}

// @formatter:on