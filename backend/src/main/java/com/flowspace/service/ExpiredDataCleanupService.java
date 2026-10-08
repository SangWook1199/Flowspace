package com.flowspace.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.entity.enums.InviteStatus;
import com.flowspace.repository.PasswordResetTokenRepository;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.WorkspaceInviteRepository;

import lombok.RequiredArgsConstructor;

// 쌓이기만 하는 만료 데이터(리프레시 토큰, 비밀번호 재설정 토큰, 오래된 대기 초대)를 지워요. (CleanupScheduler가 호출)
@Service
@RequiredArgsConstructor
public class ExpiredDataCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;

    // 만료된 리프레시 토큰 삭제 (반환: 지운 개수)
    @Transactional
    public int deleteExpiredRefreshTokens() {
        return refreshTokenRepository.deleteExpired(LocalDateTime.now());
    }

    // 만료된 비밀번호 재설정 토큰 삭제 (반환: 지운 개수)
    @Transactional
    public int deleteExpiredPasswordResetTokens() {
        return passwordResetTokenRepository.deleteExpired(LocalDateTime.now());
    }

    // 보낸 지 retentionDays일이 지나도록 수락·거절이 없는 초대 삭제 (반환: 지운 개수)
    @Transactional
    public int deleteStaleInvites(int retentionDays) {
        return workspaceInviteRepository.deleteByStatusAndCreatedAtBefore(InviteStatus.PENDING,
            LocalDateTime.now().minusDays(retentionDays));
    }
}
