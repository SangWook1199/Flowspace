package com.flowspace.dto.block;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 블록 들여쓰기 요청 DTO
public record BlockIndentRequest(

    Long parentBlockId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on