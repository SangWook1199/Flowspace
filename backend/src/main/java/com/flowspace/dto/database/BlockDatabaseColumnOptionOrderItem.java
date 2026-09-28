package com.flowspace.dto.database;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 컬럼 옵션 순서 항목 DTO
public record BlockDatabaseColumnOptionOrderItem(

    @NotNull(message = "옵션 ID는 필수입니다.")
    Long optionId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on
