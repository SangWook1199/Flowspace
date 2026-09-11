package com.flowspace.controller;

import com.flowspace.dto.auth.LoginRequest;
import com.flowspace.dto.auth.LoginResponse;
import com.flowspace.dto.auth.ProfileUpdateRequest;
import com.flowspace.dto.auth.SignupRequest;
import com.flowspace.dto.auth.UserResponse;
import com.flowspace.dto.auth.TokenResponse;
import com.flowspace.dto.auth.TokenRequest;
import com.flowspace.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public LoginResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @Operation(summary = "로그인", description = "성공 시 accessToken과 refreshToken을 반환합니다.")
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping(value = "/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public TokenResponse token(@Valid @ModelAttribute TokenRequest request) {
        return authService.loginForSwagger(request);
    }

    @Operation(summary = "내 정보 조회")
    @SecurityRequirement(name = "OAuth2")
    @GetMapping("/me")
    public UserResponse getMe(@AuthenticationPrincipal UserDetails userDetails) {
        return authService.getMe(userDetails.getUsername());
    }

    @Operation(summary = "프로필 이미지 수정")
    @PatchMapping(value = "/me/profile/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse updateProfileImage(@RequestPart MultipartFile image,
        @AuthenticationPrincipal UserDetails userDetails) {

        return authService.updateProfileImage(image, userDetails.getUsername());
    }

    @Operation(summary = "프로필 수정")
    @PatchMapping(value = "/me/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse updateProfile(@RequestPart("data") @Valid ProfileUpdateRequest request,
        @RequestPart(value = "image", required = false) MultipartFile image,
        @AuthenticationPrincipal UserDetails userDetails) {

        return authService.updateProfile(request, image, userDetails.getUsername());
    }

    @Operation(summary = "프로필 이미지 삭제")
    @DeleteMapping("/me/profile/image")
    public UserResponse deleteProfileImage(@AuthenticationPrincipal UserDetails userDetails) {

        return authService.deleteProfileImage(userDetails.getUsername());
    }
}