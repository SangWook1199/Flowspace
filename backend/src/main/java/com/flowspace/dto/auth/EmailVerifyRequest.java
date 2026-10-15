package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;

// @formatter:off
public record EmailVerifyRequest(

    @NotBlank
    String token

) {}
// @formatter:on
