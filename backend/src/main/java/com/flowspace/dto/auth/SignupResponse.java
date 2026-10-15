package com.flowspace.dto.auth;

// 회원가입 결과: 이메일 인증을 마쳐야 로그인할 수 있어서, 토큰 대신 인증 메일을 보낸 주소만 돌려줘요.
// @formatter:off
public record SignupResponse(

    String email

) {}
// @formatter:on
