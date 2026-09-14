// @formatter:off
package com.flowspace.dto.auth;

public record GoogleUserInfo(

    String providerId,
    String email,
    String nickname,
    String pictureUrl

) {}
// @formatter:on