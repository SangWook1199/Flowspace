package com.flowspace.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.flowspace.dto.search.SearchResponse;
import com.flowspace.service.SearchService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/search")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class SearchController {

    private final SearchService searchService;

    @Operation(summary = "통합 검색", description = "워크스페이스 안의 페이지(제목·본문)·작업·스프린트·댓글·일정을 종류별로 최대 6개씩 검색합니다.")
    @GetMapping
    public SearchResponse search(@PathVariable Long workspaceId, @RequestParam("q") String query,
        @AuthenticationPrincipal UserDetails userDetails) {
        return searchService.search(workspaceId, query, userDetails.getUsername());
    }
}
