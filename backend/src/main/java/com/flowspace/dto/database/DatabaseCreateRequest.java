package com.flowspace.dto.database;

import com.flowspace.entity.enums.DatabaseViewType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

// 데이터베이스 생성 요청 DTO
public record DatabaseCreateRequest(

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 100, message = "제목은 100자 이하입니다.")
    String title,

    DatabaseViewType viewType,

    // 시드 행(첫 번째 행)에 연결할 기존 페이지 (없으면 새 페이지를 만들어요)
    Long seedPageId

) {
}

// @formatter:on