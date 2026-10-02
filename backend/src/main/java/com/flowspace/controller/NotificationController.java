package com.flowspace.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.flowspace.dto.notification.NotificationPageResponse;
import com.flowspace.dto.notification.UnreadCountResponse;
import com.flowspace.service.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "내 알림 목록 조회", description = "최신순이고, 읽지 않은 알림 수(unreadCount)도 같이 내려줍니다.")
    @GetMapping
    public NotificationPageResponse getNotifications(@RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size, @AuthenticationPrincipal UserDetails userDetails) {
        return notificationService.getNotifications(userDetails.getUsername(), page, size);
    }

    @Operation(summary = "읽지 않은 알림 수 조회")
    @GetMapping("/unread-count")
    public UnreadCountResponse getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        return notificationService.getUnreadCount(userDetails.getUsername());
    }

    @Operation(summary = "알림 모두 읽음 처리")
    @PatchMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllRead(userDetails.getUsername());
    }

    @Operation(summary = "알림 읽음 처리")
    @PatchMapping("/{notificationId}/read")
    public void markRead(@PathVariable Long notificationId, @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markRead(notificationId, userDetails.getUsername());
    }

    @Operation(summary = "알림 삭제")
    @DeleteMapping("/{notificationId}")
    public void delete(@PathVariable Long notificationId, @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.delete(notificationId, userDetails.getUsername());
    }
}
