// @formatter:off
package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(

    @NotBlank
    String idToken

) {}
// @formatter:on