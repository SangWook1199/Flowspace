package com.flowspace.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.flowspace.dto.retrospective.RetrospectiveResponse;
import com.flowspace.service.RetrospectiveService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class RetrospectiveController {

    private final RetrospectiveService retrospectiveService;

    @Operation(summary = "회고 단건 조회")
    @GetMapping("/retrospectives/{retrospectiveId}")
    public RetrospectiveResponse getRetrospective(@PathVariable Long retrospectiveId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return retrospectiveService.getRetrospective(retrospectiveId, userDetails.getUsername());
    }

}