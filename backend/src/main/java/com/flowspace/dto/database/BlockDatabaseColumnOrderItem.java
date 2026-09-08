package com.flowspace.dto.database;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 컬럼 순서 항목 DTO
public record BlockDatabaseColumnOrderItem(

    @NotNull(message = "컬럼 ID는 필수입니다.")
    Long columnId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on