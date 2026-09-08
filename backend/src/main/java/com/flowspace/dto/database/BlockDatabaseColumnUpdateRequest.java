package com.flowspace.dto.database;

import com.flowspace.entity.enums.DatabaseColumnType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// 데이터베이스 컬럼 수정 요청 DTO
public record BlockDatabaseColumnUpdateRequest(

    @NotBlank(message = "컬럼명은 필수입니다.")
    @Size(max = 50, message = "컬럼명은 50자 이하입니다.")
    String name,

    @NotNull(message = "컬럼 타입은 필수입니다.")
    DatabaseColumnType type

) {
}

// @formatter:on