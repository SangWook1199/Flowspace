package com.flowspace.dto.database;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// @formatter:off

// 컬럼 너비 수정 요청 DTO — 프론트 ColumnResizeHandle의 clampColumnWidth
// (90 ~ 640px)와 범위를 맞춰요.
public record BlockDatabaseColumnWidthUpdateRequest(

    @NotNull(message = "너비는 필수입니다.")
    @Min(value = 90, message = "너비는 90px 이상이어야 합니다.")
    @Max(value = 640, message = "너비는 640px 이하여야 합니다.")
    Integer width

) {
}

// @formatter:on
