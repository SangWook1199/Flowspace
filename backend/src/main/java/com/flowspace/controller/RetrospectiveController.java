package com.flowspace.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.flowspace.dto.retrospective.RetrospectiveListItem;
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

    @Operation(summary = "워크스페이스 회고 목록 조회", description = "회고가 아직 없는 스프린트는 retrospectiveId와 통계가 null로 내려갑니다.")
    @GetMapping("/workspaces/{workspaceId}/retrospectives")
    public List<RetrospectiveListItem> getRetrospectives(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return retrospectiveService.getRetrospectives(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "회고 단건 조회")
    @GetMapping("/retrospectives/{retrospectiveId}")
    public RetrospectiveResponse getRetrospective(@PathVariable Long retrospectiveId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return retrospectiveService.getRetrospective(retrospectiveId, userDetails.getUsername());
    }

}