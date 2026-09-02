package com.flowspace.dto.auth;

import com.flowspace.entity.User;
import com.flowspace.entity.enums.Provider;
import com.flowspace.entity.enums.UserStatus;

public record UserResponse(
        Long userId,
        String email,
        String name,
        String nickname,
        Provider provider,
        UserStatus status) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getEmail(),
                user.getName(),
                user.getNickname(),
                user.getProvider(),
                user.getStatus());
    }
}