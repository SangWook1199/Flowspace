package com.flowspace.dto.auth;

import com.flowspace.entity.User;
import com.flowspace.entity.enums.Provider;

// @formatter:off
public record UserResponse(
        Long userId,
        String email,
        String nickname,
        Provider provider,
        String profileImageUrl) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getEmail(),
                user.getNickname(),
                user.getProvider(),
                user.getProfileFile() == null ? null : user.getProfileFile().getFileUrl());
    }
}