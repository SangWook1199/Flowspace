package com.flowspace.repository;

import com.flowspace.entity.User;
import com.flowspace.entity.enums.Provider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(Provider provider, String providerId);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    // 마지막 접속 시각만 바로 갱신해요(엔티티를 불러오지 않고 한 줄 UPDATE)
    @Transactional
    @Modifying
    @Query("update User u set u.lastActiveAt = :at where u.userId = :userId")
    int updateLastActiveAt(@Param("userId") Long userId, @Param("at") LocalDateTime at);

}