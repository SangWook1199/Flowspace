package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off
public record PasswordResetRequest(

    @NotBlank
    String token,

    @NotBlank @Size(min = 8, max = 20)
    String newPassword

) {}
// @formatter:on
