package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off
public record ProfileUpdateRequest(

    @NotBlank
    @Size(max = 30)
    String nickname

) {}