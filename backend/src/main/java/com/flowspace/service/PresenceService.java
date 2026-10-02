package com.flowspace.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.websocket.NotificationWebSocketHandler;
import com.flowspace.websocket.UserConnectionEvent;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 접속 상태(온라인/오프라인). "WebSocket 연결이 하나라도 열려 있으면 온라인"이에요.
// 상태가 바뀌면 같은 워크스페이스에 있는 접속 중인 멤버들에게 { type: "PRESENCE", data: { userId, online } }를 보내요.
@Slf4j
@Service
@RequiredArgsConstructor
public class PresenceService {

    // 새로고침·재연결로 잠깐 끊기는 동안 오프라인으로 깜빡이지 않게, 이 시간 뒤에도 연결이 없을 때만 오프라인으로 알려요.
    private static final long OFFLINE_GRACE_SECONDS = 3;

    private static final String SOCKET_TYPE_PRESENCE = "PRESENCE";

    private final NotificationWebSocketHandler socketHandler;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "presence-offline");
        thread.setDaemon(true);
        return thread;
    });

    // 지금 접속 중인지
    public boolean isOnline(Long userId) {
        return socketHandler.isOnline(userId);
    }

    @EventListener
    public void onConnectionChanged(UserConnectionEvent event) {

        if (event.online()) {
            // 서버가 갑자기 꺼져서 끊김 처리를 못 하더라도 "마지막 접속"이 너무 옛날로 남지 않게 접속할 때도 기록해요.
            touchLastActive(event.userId());
            broadcast(event.userId(), true, null);
            return;
        }

        scheduler.schedule(() -> {
            if (!socketHandler.isOnline(event.userId())) {
                LocalDateTime lastActiveAt = touchLastActive(event.userId());
                broadcast(event.userId(), false, lastActiveAt);
            }
        }, OFFLINE_GRACE_SECONDS, TimeUnit.SECONDS);
    }

    // 마지막 접속 시각을 지금으로 갱신해요. 실패해도 접속 상태 알림은 계속돼요(null을 돌려줘요).
    private LocalDateTime touchLastActive(Long userId) {

        LocalDateTime now = LocalDateTime.now();

        try {
            userRepository.updateLastActiveAt(userId, now);
            return now;
        } catch (Exception e) {
            log.warn("마지막 접속 시각을 갱신하지 못했어요. userId={}", userId, e);
            return null;
        }
    }

    // 같은 워크스페이스를 쓰는 다른 멤버들에게 상태 변화를 알려요(접속 중이 아닌 사람에겐 아무 일도 안 일어나요).
    // 오프라인이 될 때는 마지막 접속 시각(ISO 문자열)도 같이 보내요.
    private void broadcast(Long userId, boolean online, LocalDateTime lastActiveAt) {

        try {
            List<Long> coMemberIds = workspaceMemberRepository.findCoMemberIds(userId);

            Map<String, Object> data = new HashMap<>();
            data.put("userId", userId);
            data.put("online", online);
            data.put("lastActiveAt", lastActiveAt == null ? null : lastActiveAt.toString());

            for (Long coMemberId : coMemberIds) {
                socketHandler.sendToUser(coMemberId, SOCKET_TYPE_PRESENCE, data);
            }
        } catch (Exception e) {
            log.warn("접속 상태를 알리지 못했어요. userId={}", userId, e);
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
