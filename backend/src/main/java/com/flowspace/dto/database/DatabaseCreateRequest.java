package com.flowspace.dto.database;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

// 데이터베이스 생성 요청 DTO
public record DatabaseCreateRequest(

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 100, message = "제목은 100자 이하입니다.")
    String title

) {
}

// @formatter:on