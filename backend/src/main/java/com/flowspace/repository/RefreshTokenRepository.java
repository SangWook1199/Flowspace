package com.flowspace.repository;

import com.flowspace.entity.RefreshToken;
import com.flowspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    Optional<RefreshToken> findByUser(User user);

    void deleteByUser(User user);

    // 만료된 리프레시 토큰을 한 번에 지워요(정리 작업용)
    @Modifying
    @Query("delete from RefreshToken t where t.expiredAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}