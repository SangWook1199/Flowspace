package com.flowspace.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.flowspace.dto.database.BlockDatabaseCellResponse;
import com.flowspace.dto.database.BlockDatabaseCellUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnCreateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnResponse;
import com.flowspace.dto.database.BlockDatabaseColumnUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseRowResponse;
import com.flowspace.dto.database.DatabaseCreateRequest;
import com.flowspace.dto.database.DatabaseDetailResponse;
import com.flowspace.dto.database.DatabaseResponse;
import com.flowspace.dto.database.DatabaseUpdateRequest;
import com.flowspace.service.BlockDatabaseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class BlockDatabaseController {

    private final BlockDatabaseService blockDatabaseService;

    @Operation(summary = "데이터베이스 생성")
    @PostMapping("/pages/{pageId}/databases")
    public DatabaseResponse createDatabase(@PathVariable Long pageId, @Valid @RequestBody DatabaseCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.createDatabase(pageId, request, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 단건 조회")
    @GetMapping("/databases/{databaseId}")
    public DatabaseResponse getDatabase(@PathVariable Long databaseId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.getDatabase(databaseId, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 제목 수정")
    @PatchMapping("/databases/{databaseId}")
    public DatabaseResponse updateDatabase(@PathVariable Long databaseId,
        @Valid @RequestBody DatabaseUpdateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.updateDatabase(databaseId, request, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 삭제")
    @DeleteMapping("/databases/{databaseId}")
    public void deleteDatabase(@PathVariable Long databaseId, @AuthenticationPrincipal UserDetails userDetails) {
        blockDatabaseService.deleteDatabase(databaseId, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 컬럼 생성")
    @PostMapping("/databases/{databaseId}/columns")
    public BlockDatabaseColumnResponse createColumn(@PathVariable Long databaseId,
        @Valid @RequestBody BlockDatabaseColumnCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.createColumn(databaseId, request, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 컬럼 수정")
    @PatchMapping("/databases/{databaseId}/columns/{columnId}")
    public BlockDatabaseColumnResponse updateColumn(@PathVariable Long databaseId, @PathVariable Long columnId,
        @Valid @RequestBody BlockDatabaseColumnUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.updateColumn(columnId, request, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 컬럼 삭제")
    @DeleteMapping("/databases/{databaseId}/columns/{columnId}")
    public void deleteColumn(@PathVariable Long databaseId, @PathVariable Long columnId,
        @AuthenticationPrincipal UserDetails userDetails) {
        blockDatabaseService.deleteColumn(columnId, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 행 생성")
    @PostMapping("/databases/{databaseId}/rows")
    public BlockDatabaseRowResponse createRow(@PathVariable Long databaseId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.createRow(databaseId, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 행 삭제")
    @DeleteMapping("/databases/{databaseId}/rows/{rowId}")
    public void deleteRow(@PathVariable Long databaseId, @PathVariable Long rowId,
        @AuthenticationPrincipal UserDetails userDetails) {
        blockDatabaseService.deleteRow(rowId, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 셀 수정")
    @PatchMapping("/databases/{databaseId}/cells")
    public BlockDatabaseCellResponse updateCell(@PathVariable Long databaseId,
        @Valid @RequestBody BlockDatabaseCellUpdateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.updateCell(databaseId, request, userDetails.getUsername());
    }

    @Operation(summary = "데이터베이스 전체 조회")
    @GetMapping("/databases/{databaseId}/detail")
    public DatabaseDetailResponse getDatabaseDetail(@PathVariable Long databaseId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return blockDatabaseService.getDatabaseDetail(databaseId, userDetails.getUsername());
    }
}