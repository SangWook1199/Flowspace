package com.flowspace.dto.database;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 행 순서 항목 DTO
public record BlockDatabaseRowOrderItem(

    @NotNull(message = "행 ID는 필수입니다.")
    Long rowId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on