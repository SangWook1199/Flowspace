package com.flowspace.dto.page;

import jakarta.validation.constraints.NotBlank;

// @formatter:off

// 기본 커버 선택 요청 DTO
public record PageCoverUpdateRequest(

    @NotBlank(message = "커버 이름은 필수입니다.")
    String coverName

) {
}

// @formatter:on