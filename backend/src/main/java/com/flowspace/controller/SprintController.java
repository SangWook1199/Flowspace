package com.flowspace.controller;

import com.flowspace.dto.sprint.SprintCreateRequest;
import com.flowspace.dto.sprint.SprintResponse;
import com.flowspace.dto.sprint.SprintStatusUpdateRequest;
import com.flowspace.dto.sprint.SprintUpdateRequest;
import com.flowspace.service.SprintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class SprintController {

    private final SprintService sprintService;

    @Operation(summary = "스프린트 생성")
    @PostMapping("/workspaces/{workspaceId}/sprints")
    public SprintResponse createSprint(@PathVariable Long workspaceId, @Valid @RequestBody SprintCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return sprintService.createSprint(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "워크스페이스 스프린트 목록 조회")
    @GetMapping("/workspaces/{workspaceId}/sprints")
    public List<SprintResponse> getSprints(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return sprintService.getSprints(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "스프린트 단건 조회")
    @GetMapping("/sprints/{sprintId}")
    public SprintResponse getSprint(@PathVariable Long sprintId, @AuthenticationPrincipal UserDetails userDetails) {
        return sprintService.getSprint(sprintId, userDetails.getUsername());
    }

    @Operation(summary = "스프린트 수정")
    @PatchMapping("/sprints/{sprintId}")
    public SprintResponse updateSprint(@PathVariable Long sprintId, @Valid @RequestBody SprintUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return sprintService.updateSprint(sprintId, request, userDetails.getUsername());
    }

    @Operation(summary = "스프린트 상태 변경")
    @PatchMapping("/sprints/{sprintId}/status")
    public SprintResponse updateStatus(@PathVariable Long sprintId,
        @Valid @RequestBody SprintStatusUpdateRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        return sprintService.updateStatus(sprintId, request, userDetails.getUsername());
    }

    @Operation(summary = "스프린트 삭제")
    @DeleteMapping("/sprints/{sprintId}")
    public void deleteSprint(@PathVariable Long sprintId, @AuthenticationPrincipal UserDetails userDetails) {
        sprintService.deleteSprint(sprintId, userDetails.getUsername());
    }
}