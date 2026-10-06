package com.flowspace.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.PasswordResetToken;
import com.flowspace.entity.User;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);

    void deleteByUser(User user);
}
