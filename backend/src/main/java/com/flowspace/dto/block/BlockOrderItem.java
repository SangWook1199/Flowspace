package com.flowspace.dto.block;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 블록 순서 항목 DTO
public record BlockOrderItem(

    @NotNull(message = "블록 ID는 필수입니다.")
    Long blockId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on