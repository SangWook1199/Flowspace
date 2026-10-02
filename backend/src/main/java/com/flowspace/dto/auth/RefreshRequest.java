package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;

// @formatter:off

// 토큰 재발급 요청 DTO
public record RefreshRequest(

    @NotBlank(message = "리프레시 토큰은 필수입니다.")
    String refreshToken

) {
}

// @formatter:on