package com.flowspace.dto.database;

import com.flowspace.entity.enums.DatabaseViewType;
import jakarta.validation.constraints.NotNull;

// @formatter:off

// 데이터베이스 View 변경 요청 DTO
public record DatabaseViewUpdateRequest(

    @NotNull(message = "뷰 타입은 필수입니다.")
    DatabaseViewType viewType

) {
}

// @formatter:on