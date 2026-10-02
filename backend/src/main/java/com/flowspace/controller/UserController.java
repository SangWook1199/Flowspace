package com.flowspace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.flowspace.dto.user.UserLookupResponse;
import com.flowspace.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class UserController {

    private final UserService userService;

    @Operation(summary = "이메일로 사용자 찾기 (초대용, 이메일이 정확히 같은 한 명)")
    @GetMapping("/lookup")
    public ResponseEntity<UserLookupResponse> lookupByEmail(@RequestParam String email,
        @RequestParam(required = false) Long workspaceId, @AuthenticationPrincipal UserDetails userDetails) {

        return userService.lookupByEmail(email, workspaceId, userDetails.getUsername()).map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
