package com.flowspace.dto.database;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

// @formatter:off

// 행 순서 변경 요청 DTO
public record BlockDatabaseRowReorderRequest(

    @Valid
    @NotEmpty(message = "행 목록은 비어 있을 수 없습니다.")
    @Size(max = 5000, message = "한 번에 5000개까지만 바꿀 수 있습니다.")
    List<BlockDatabaseRowOrderItem> rows

) {
}

// @formatter:on