// @formatter:off
package com.flowspace.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record MicrosoftLoginRequest(

    @NotBlank
    String idToken,

    @NotBlank
    String accessToken

) {}
// @formatter:on