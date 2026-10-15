package com.flowspace.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off
public record EmailResendRequest(

    @NotBlank @Email @Size(max = 100)
    String email

) {}
// @formatter:on
