package com.flowspace.controller;

import com.flowspace.dto.activity.ActivityPageResponse;
import com.flowspace.dto.activity.ActivityResponse;
import com.flowspace.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class ActivityController {

    private final ActivityService activityService;

    @Operation(summary = "최근 활동 7개 조회")
    @GetMapping("/workspaces/{workspaceId}/activities/recent")
    public List<ActivityResponse> getRecentActivities(@PathVariable Long workspaceId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return activityService.getRecentActivities(workspaceId, userDetails.getUsername());
    }

    @Operation(summary = "활동 전체 조회", description = "category(PAGE·TASK·COMMENT·SPRINT)와 userId로 걸러 볼 수 있습니다. 한 페이지에 20개씩, page는 0부터 시작합니다.")
    @GetMapping("/workspaces/{workspaceId}/activities")
    public ActivityPageResponse getActivities(@PathVariable Long workspaceId,
        @RequestParam(defaultValue = "0") Integer page, @RequestParam(required = false) String category,
        @RequestParam(required = false) Long userId, @AuthenticationPrincipal UserDetails userDetails) {
        return activityService.getActivities(workspaceId, page, category, userId, userDetails.getUsername());
    }
}