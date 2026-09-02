package com.flowspace.dto.auth;

import lombok.Builder;

@Builder
public record TokenResponse(
        String access_token,
        String token_type,
        Long expires_in,
        String refresh_token) {
    public static TokenResponse of(
            String accessToken,
            String refreshToken) {
        return TokenResponse.builder()
                .access_token(accessToken)
                .token_type("Bearer")
                .expires_in(3600L)
                .refresh_token(refreshToken)
                .build();
    }
}