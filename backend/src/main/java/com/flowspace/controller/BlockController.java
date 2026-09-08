package com.flowspace.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.flowspace.dto.block.BlockCreateRequest;
import com.flowspace.dto.block.BlockIndentRequest;
import com.flowspace.dto.block.BlockReorderRequest;
import com.flowspace.dto.block.BlockResponse;
import com.flowspace.dto.block.BlockUpdateRequest;
import com.flowspace.service.BlockService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class BlockController {

    private final BlockService blockService;

    @Operation(summary = "블록 생성")
    @PostMapping("/pages/{pageId}/blocks")
    public BlockResponse createBlock(@PathVariable Long pageId, @Valid @RequestBody BlockCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockService.createBlock(pageId, request, userDetails.getUsername());
    }

    @Operation(summary = "페이지 블록 목록 조회")
    @GetMapping("/pages/{pageId}/blocks")
    public List<BlockResponse> getBlocks(@PathVariable Long pageId, @AuthenticationPrincipal UserDetails userDetails) {
        return blockService.getBlocks(pageId, userDetails.getUsername());
    }

    @Operation(summary = "블록 수정")
    @PatchMapping("/blocks/{blockId}")
    public BlockResponse updateBlock(@PathVariable Long blockId, @Valid @RequestBody BlockUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockService.updateBlock(blockId, request, userDetails.getUsername());
    }

    @Operation(summary = "블록 삭제")
    @DeleteMapping("/blocks/{blockId}")
    public void deleteBlock(@PathVariable Long blockId, @AuthenticationPrincipal UserDetails userDetails) {
        blockService.deleteBlock(blockId, userDetails.getUsername());
    }

    @Operation(summary = "블록 순서 변경")
    @PatchMapping("/pages/{pageId}/blocks/reorder")
    public void reorderBlocks(@PathVariable Long pageId, @Valid @RequestBody BlockReorderRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        blockService.reorderBlocks(pageId, request, userDetails.getUsername());
    }

    @Operation(summary = "블록 이동")
    @PatchMapping("/blocks/{blockId}/move")
    public BlockResponse moveBlock(@PathVariable Long blockId, @Valid @RequestBody BlockIndentRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockService.moveBlock(blockId, request, userDetails.getUsername());
    }
}