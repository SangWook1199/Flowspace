package com.flowspace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 알림 정기 작업: 매일 아침 마감 임박 알림, 새벽에 오래된 알림 정리
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final NotificationService notificationService;

    // 알림 보관 기간(일). 지나면 삭제해요.
    @Value("${flowspace.notification.retention-days:60}")
    private int retentionDays;

    // 매일 09:00 (서버 시간대 기준)
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDueSoon() {
        try {
            int sent = notificationService.sendDueSoonNotifications();
            log.info("마감 임박 알림 {}건 전송", sent);
        } catch (Exception e) {
            log.error("마감 임박 알림 전송 중 오류", e);
        }
    }

    // 매일 04:30
    @Scheduled(cron = "0 30 4 * * *")
    public void cleanUp() {
        try {
            int deleted = notificationService.deleteOldNotifications(retentionDays);
            log.info("오래된 알림 {}건 삭제 (보관 {}일)", deleted, retentionDays);
        } catch (Exception e) {
            log.error("오래된 알림 정리 중 오류", e);
        }
    }
}
