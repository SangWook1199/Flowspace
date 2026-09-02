package com.flowspace.dto.auth;

import com.flowspace.entity.User;

public record LoginResponse(
        Long userId,
        String email,
        String name,
        String nickname,
        String accessToken,
        String refreshToken) {
    public static LoginResponse from(
            User user,
            String accessToken,
            String refreshToken) {
        return new LoginResponse(
                user.getUserId(),
                user.getEmail(),
                user.getName(),
                user.getNickname(),
                accessToken,
                refreshToken);
    }
}