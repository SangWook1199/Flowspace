package com.flowspace.dto.database;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

// @formatter:off

// 컬럼 옵션 순서 변경 요청 DTO
public record BlockDatabaseColumnOptionReorderRequest(

    @Valid
    @NotEmpty(message = "옵션 목록은 비어 있을 수 없습니다.")
    @Size(max = 500, message = "한 번에 500개까지만 바꿀 수 있습니다.")
    List<BlockDatabaseColumnOptionOrderItem> options

) {
}

// @formatter:on
