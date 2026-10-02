package com.flowspace.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// @formatter:off
public record LoginRequest(

    @NotBlank @Email
    String email,

    @NotBlank
    String password,

    // 로그인 상태 유지 (보내지 않으면 유지하는 것으로 봐요)
    Boolean rememberMe

) {

    public boolean remember() {
        return rememberMe == null || rememberMe;
    }
}
// @formatter:on
