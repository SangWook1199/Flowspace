package com.flowspace.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.EmailVerificationToken;
import com.flowspace.entity.User;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    Optional<EmailVerificationToken> findTopByUserOrderByCreatedAtDesc(User user);

    void deleteByUser(User user);

    // 만료된 인증 토큰을 한 번에 지워요(정리 작업용)
    @Modifying
    @Query("delete from EmailVerificationToken t where t.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
