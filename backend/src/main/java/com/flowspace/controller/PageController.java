package com.flowspace.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.file.CoverResponse;
import com.flowspace.dto.page.PageCoverUpdateRequest;
import com.flowspace.dto.page.PageCreateRequest;
import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.dto.page.PageResponse;
import com.flowspace.dto.page.PageUpdateRequest;
import com.flowspace.service.FileService;
import com.flowspace.service.PageService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class PageController {

    private final PageService pageService;
    private final FileService fileService;

    @Operation(summary = "페이지 생성")
    @PostMapping("/workspaces/{workspaceId}/pages")
    public PageResponse createPage(@PathVariable Long workspaceId, @Valid @RequestBody PageCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.createPage(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 페이지 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/pages")
    public List<PageResponse> getPages(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.getPages(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 단건 조회")
    @GetMapping("/pages/{pageId}")
    public PageResponse getPage(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.getPage(pageId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 수정")
    @PatchMapping("/pages/{pageId}")
    public PageResponse updatePage(@PathVariable Long pageId, @Valid @RequestBody PageUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.updatePage(pageId, request, userDetails.getUsername());
    }

    @Operation(summary = "페이지 삭제")
    @DeleteMapping("/pages/{pageId}")
    public void deletePage(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        pageService.deletePage(pageId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 상세 조회")
    @GetMapping("/pages/{pageId}/detail")
    public PageDetailResponse getPageDetail(@PathVariable Long pageId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.getPageDetail(pageId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 커버 업로드")
    @PostMapping("/pages/{pageId}/cover")
    public PageResponse uploadCover(@PathVariable Long pageId, @RequestParam("file") MultipartFile file,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.uploadCover(pageId, file, userDetails.getUsername());
    }

    @Operation(summary = "페이지 커버 삭제")
    @DeleteMapping("/pages/{pageId}/cover")
    public PageResponse deleteCover(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.deleteCover(pageId, userDetails.getUsername());
    }

    @Operation(summary = "기본 커버 갤러리 조회")
    @GetMapping("/covers")
    public List<CoverResponse> getCoverGallery() {
        return fileService.getCoverGallery();
    }

    @Operation(summary = "기본 커버 적용")
    @PatchMapping("/pages/{pageId}/cover/default")
    public PageResponse applyDefaultCover(@PathVariable Long pageId, @Valid @RequestBody PageCoverUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.applyDefaultCover(pageId, request, userDetails.getUsername());
    }
}