package com.flowspace.dto.database;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

// @formatter:off

// 컬럼 순서 변경 요청 DTO
public record BlockDatabaseColumnReorderRequest(

    @Valid
    @NotEmpty(message = "컬럼 목록은 비어 있을 수 없습니다.")
    List<BlockDatabaseColumnOrderItem> columns

) {
}

// @formatter:on