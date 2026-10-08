package com.flowspace.dto.auth;

import jakarta.validation.constraints.Size;

// @formatter:off

// 회원 탈퇴 요청 DTO
// 이메일로 가입한 계정은 password, 구글·마이크로소프트 계정은 confirmEmail(계정 이메일을 그대로 입력)로 본인임을 확인해요.
public record WithdrawRequest(

    @Size(max = 100, message = "비밀번호가 너무 깁니다.")
    String password,

    @Size(max = 255, message = "이메일이 너무 깁니다.")
    String confirmEmail

) {}

// @formatter:on
