package com.flowspace.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(

        @NotBlank @Email @Size(max = 100) String email,

        @NotBlank @Size(min = 8, max = 20) String password,

        @NotBlank @Size(max = 30) String name,

        @NotBlank @Size(max = 30) String nickname) {
}