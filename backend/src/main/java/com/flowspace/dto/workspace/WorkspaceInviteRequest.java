package com.flowspace.dto.workspace;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// @formatter:off

// 워크스페이스 초대 요청 DTO
public record WorkspaceInviteRequest(

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email
) {
}

// @formatter:on