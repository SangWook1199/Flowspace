package com.flowspace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 휴지통에 들어간 지 보관 기간(기본 30일)이 지난 페이지를 매일 새벽에 영구 삭제해요.
@Slf4j
@Component
@RequiredArgsConstructor
public class TrashCleanupScheduler {

    private final PageService pageService;

    @Value("${flowspace.trash.retention-days:30}")
    private int retentionDays;

    // 매일 04:00 (서버 시간대 기준)
    @Scheduled(cron = "0 0 4 * * *")
    public void purgeExpiredTrash() {
        try {
            int count = pageService.purgeExpiredTrash(retentionDays);
            log.info("휴지통 자동 정리: 보관 {}일 경과 페이지 {}개 처리", retentionDays, count);
        } catch (Exception e) {
            // 한 번 실패해도 다음 날 다시 시도하니까, 앱이 죽지 않게 기록만 해요.
            log.error("휴지통 자동 정리 중 오류", e);
        }
    }
}
