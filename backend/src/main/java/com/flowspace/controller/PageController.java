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
import com.flowspace.dto.page.PageDuplicateRequest;
import com.flowspace.dto.page.PageReorderRequest;
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

    @Operation(summary = "휴지통 페이지 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/pages/trash")
    public List<PageResponse> getTrash(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.getTrash(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "휴지통 비우기", description = "OWNER만 가능합니다. 회고 페이지는 삭제하지 않고 남겨둡니다.")
    @DeleteMapping("/workspaces/{workspaceId}/pages/trash")
    public void emptyTrash(@PathVariable Long workspaceId, @AuthenticationPrincipal UserDetails userDetails) {
        pageService.emptyTrash(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 순서 변경", description = "같은 상위 페이지에 속한 페이지 ID를 표시 순서대로 전달합니다.")
    @PatchMapping("/workspaces/{workspaceId}/pages/reorder")
    public void reorderPages(@PathVariable Long workspaceId, @Valid @RequestBody PageReorderRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        pageService.reorderPages(workspaceId, request, userDetails.getUsername());
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

    @Operation(summary = "휴지통 페이지 복원")
    @PostMapping("/pages/{pageId}/restore")
    public PageResponse restorePage(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.restorePage(pageId, userDetails.getUsername());
    }

    @Operation(summary = "휴지통 페이지 영구 삭제", description = "OWNER만 가능합니다.")
    @DeleteMapping("/pages/{pageId}/permanent")
    public void deletePagePermanently(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        pageService.deletePagePermanently(pageId, userDetails.getUsername());
    }

    @Operation(summary = "페이지 복제", description = "하위 페이지, 블록, 데이터베이스를 함께 복제합니다.")
    @PostMapping("/pages/{pageId}/duplicate")
    public PageResponse duplicatePage(@PathVariable Long pageId,
        @RequestBody(required = false) PageDuplicateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return pageService.duplicatePage(pageId, request, userDetails.getUsername());
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