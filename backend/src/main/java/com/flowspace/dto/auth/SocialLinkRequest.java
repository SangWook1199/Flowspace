package com.flowspace.dto.auth;

import com.flowspace.entity.enums.Provider;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// 소셜 로그인 때 "같은 이메일의 계정이 있어요"라고 안내받은 사용자가, 그 계정의 비밀번호로 확인하고 연결을 요청해요.
// provider는 GOOGLE | MICROSOFT, accessToken은 Microsoft일 때만 써요(프로필 사진용, 선택).
// @formatter:off
public record SocialLinkRequest(

    @NotNull
    Provider provider,

    @NotBlank
    String idToken,

    String accessToken,

    @NotBlank
    String password

) {}
// @formatter:on
