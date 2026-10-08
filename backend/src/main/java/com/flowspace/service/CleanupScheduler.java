package com.flowspace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 만료된 토큰과 오래된 대기 초대를 매일 새벽에 정리해요.
@Slf4j
@Component
@RequiredArgsConstructor
public class CleanupScheduler {

    private final ExpiredDataCleanupService cleanupService;

    // 답이 없는 초대를 보관하는 기간(일). 지나면 삭제해요.
    @Value("${flowspace.invite.retention-days:30}")
    private int inviteRetentionDays;

    // 매일 05:00 (서버 시간대 기준)
    @Scheduled(cron = "0 0 5 * * *")
    public void cleanUp() {
        // 하나가 실패해도 나머지는 계속 정리해요.
        try {
            log.info("만료된 리프레시 토큰 {}건 삭제", cleanupService.deleteExpiredRefreshTokens());
        } catch (Exception e) {
            log.error("만료된 리프레시 토큰 정리 중 오류", e);
        }

        try {
            log.info("만료된 비밀번호 재설정 토큰 {}건 삭제", cleanupService.deleteExpiredPasswordResetTokens());
        } catch (Exception e) {
            log.error("만료된 비밀번호 재설정 토큰 정리 중 오류", e);
        }

        try {
            log.info("오래된 대기 초대 {}건 삭제 (보관 {}일)", cleanupService.deleteStaleInvites(inviteRetentionDays),
                inviteRetentionDays);
        } catch (Exception e) {
            log.error("오래된 대기 초대 정리 중 오류", e);
        }
    }
}
