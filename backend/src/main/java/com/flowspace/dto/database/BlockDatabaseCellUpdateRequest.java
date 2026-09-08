package com.flowspace.dto.database;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 셀 수정 요청 DTO
public record BlockDatabaseCellUpdateRequest(

    @NotNull(message = "행 ID는 필수입니다.")
    Long rowId,

    @NotNull(message = "컬럼 ID는 필수입니다.")
    Long columnId,

    String value

) {
}

// @formatter:on