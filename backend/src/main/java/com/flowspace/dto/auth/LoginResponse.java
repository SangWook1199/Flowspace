package com.flowspace.dto.auth;

import com.flowspace.entity.User;

// @formatter:off
public record LoginResponse(

    UserResponse user,

    String accessToken,
    String refreshToken,

    Long workspaceId

) {

    public static LoginResponse from(
        User user,
        String accessToken,
        String refreshToken,
        Long workspaceId
    ) {
        return new LoginResponse(
            UserResponse.from(user),
            accessToken,
            refreshToken,
            workspaceId
        );
    }
}