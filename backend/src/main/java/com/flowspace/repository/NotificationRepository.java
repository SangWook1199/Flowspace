package com.flowspace.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.Notification;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.NotificationType;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserOrderByCreatedAtDescNotificationIdDesc(User user, Pageable pageable);

    long countByUserAndIsReadFalse(User user);

    List<Notification> findByUserAndTypeAndRefIdAndIsReadFalse(User user, NotificationType type, Long refId);

    // 같은 사람·종류·대상에게 오늘 이미 보냈는지 (마감 임박 알림이 중복으로 가지 않게)
    boolean existsByUserAndTypeAndRefIdAndCreatedAtAfter(User user, NotificationType type, Long refId,
        LocalDateTime after);

    // 오늘 이미 보낸 (받는 사람, 대상) 쌍을 한 번에 읽어요: [userId, refId]
    @Query("select n.user.userId, n.refId from Notification n where n.type = :type and n.createdAt > :after")
    List<Object[]> findRecipientRefPairs(@Param("type") NotificationType type, @Param("after") LocalDateTime after);

    @Modifying
    @Query("update Notification n set n.isRead = true where n.user = :user and n.isRead = false")
    int markAllRead(@Param("user") User user);

    // 탈퇴할 때 사용자가 받은 알림을 모두 지워요.
    @Modifying
    @Query("delete from Notification n where n.user = :user")
    int deleteByUser(@Param("user") User user);

    @Modifying
    @Query("delete from Notification n where n.createdAt < :before")
    int deleteOlderThan(@Param("before") LocalDateTime before);
}
