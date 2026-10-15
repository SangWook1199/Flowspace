package com.flowspace.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.flowspace.dto.ai.AiApplyResponse;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiJobResponse;
import com.flowspace.dto.ai.AiProjectRequest;
import com.flowspace.dto.ai.AiStatusResponse;
import com.flowspace.service.ai.AiDraftJobService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class AiProjectController {

    private final AiDraftJobService aiDraftJobService;

    @Operation(summary = "AI 기능을 지금 쓸 수 있는지 확인")
    @GetMapping("/ai/status")
    public AiStatusResponse status() {
        return aiDraftJobService.status();
    }

    @Operation(summary = "AI 프로젝트 초안 만들기 시작(바로 jobId를 돌려줘요)")
    @PostMapping("/workspaces/{workspaceId}/ai/project-drafts")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AiJobResponse start(@PathVariable Long workspaceId, @Valid @RequestBody AiProjectRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return aiDraftJobService.start(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "AI 프로젝트 초안 진행 상태 조회(완성되면 초안이 함께 와요)")
    @GetMapping("/workspaces/{workspaceId}/ai/project-drafts/{jobId}")
    public AiJobResponse get(@PathVariable Long workspaceId, @PathVariable String jobId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return aiDraftJobService.get(workspaceId, jobId, userDetails.getUsername());
    }

    @Operation(summary = "AI 프로젝트 초안 만들기 취소")
    @DeleteMapping("/workspaces/{workspaceId}/ai/project-drafts/{jobId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long workspaceId, @PathVariable String jobId,
        @AuthenticationPrincipal UserDetails userDetails) {
        aiDraftJobService.cancel(workspaceId, jobId, userDetails.getUsername());
    }

    @Operation(summary = "확인한 AI 초안으로 스프린트·작업·이벤트 한 번에 만들기")
    @PostMapping("/workspaces/{workspaceId}/ai/project-drafts/{jobId}/apply")
    public AiApplyResponse apply(@PathVariable Long workspaceId, @PathVariable String jobId,
        @Valid @RequestBody AiDraft draft, @AuthenticationPrincipal UserDetails userDetails) {
        return aiDraftJobService.apply(workspaceId, jobId, draft, userDetails.getUsername());
    }
}
