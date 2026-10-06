package com.flowspace.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.websocket.NotificationWebSocketHandler;
import com.flowspace.websocket.PageViewEvent;
import com.flowspace.websocket.SocketClosedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// "지금 이 페이지를 누가 보고 있고, 어느 블록을 편집 중인지"를 메모리로만 들고 있다가 같은 페이지를 보는 사람들에게 알려줘요.
// 내용은 저장하지 않고(서버가 꺼지면 사라져요), 탭(WebSocket 세션) 단위로 기억해요.
// 보내는 메시지: { type: "PAGE_PRESENCE", data: { pageId, viewers: [{ userId, blockId }] } }
@Slf4j
@Service
@RequiredArgsConstructor
public class PagePresenceService {

    private static final String SOCKET_TYPE_PAGE_PRESENCE = "PAGE_PRESENCE";
    private static final String SOCKET_TYPE_PAGE_CONTENT = "PAGE_CONTENT";

    private final NotificationWebSocketHandler socketHandler;
    private final PageRepository pageRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    // 탭(세션) 하나가 보고 있는 곳
    private record View(Long userId, Long pageId, Long blockId) {}

    private final Map<String, View> views = new HashMap<>();

    @EventListener
    public synchronized void onPageView(PageViewEvent event) {

        View before = views.get(event.sessionId());
        Long beforePageId = before == null ? null : before.pageId();

        // 페이지를 떠났어요.
        if (event.pageId() == null) {
            views.remove(event.sessionId());
            broadcast(beforePageId);
            return;
        }

        // 새 페이지로 들어올 때만 "이 페이지가 속한 워크스페이스의 멤버인지" 확인해요(편집 블록만 바뀔 땐 생략).
        if (!event.pageId().equals(beforePageId) && !canView(event.userId(), event.pageId())) {
            return;
        }

        views.put(event.sessionId(), new View(event.userId(), event.pageId(), event.blockId()));

        broadcast(event.pageId());

        if (beforePageId != null && !beforePageId.equals(event.pageId())) {
            broadcast(beforePageId);
        }
    }

    @EventListener
    public synchronized void onClosed(SocketClosedEvent event) {

        View removed = views.remove(event.sessionId());

        if (removed != null) {
            broadcast(removed.pageId());
        }
    }

    // 누가 페이지 내용을 저장했다고, 그 페이지를 보고 있는 다른 사람들에게 알려요.
    // 받은 쪽이 페이지를 다시 받아서 자기 화면에 합쳐요(메시지에는 내용이 들어 있지 않아요).
    public synchronized void notifyContentChanged(Long pageId, String authorEmail) {

        try {
            Long authorId = userRepository.findByEmail(authorEmail).map(User::getUserId).orElse(null);

            Set<Long> targets = new HashSet<>();

            for (View view : views.values()) {
                if (pageId.equals(view.pageId()) && !view.userId().equals(authorId)) {
                    targets.add(view.userId());
                }
            }

            if (targets.isEmpty()) {
                return;
            }

            Map<String, Object> data = new HashMap<>();
            data.put("pageId", pageId);
            data.put("userId", authorId);

            for (Long userId : targets) {
                socketHandler.sendToUser(userId, SOCKET_TYPE_PAGE_CONTENT, data);
            }
        } catch (Exception e) {
            log.warn("페이지 변경을 알리지 못했어요. pageId={}", pageId, e);
        }
    }

    private boolean canView(Long userId, Long pageId) {

        try {
            Page page = pageRepository.findById(pageId).orElse(null);

            if (page == null || Boolean.TRUE.equals(page.getIsDeleted())) {
                return false;
            }

            return workspaceMemberRepository.existsByWorkspaceAndUser(
                page.getWorkspace(), userRepository.getReferenceById(userId));
        } catch (Exception e) {
            log.debug("페이지 접근 확인에 실패했어요. pageId={}, userId={}", pageId, userId, e);
            return false;
        }
    }

    // 그 페이지를 보는 모든 사람에게 "지금 보는 사람 목록"을 통째로 보내요(받은 쪽은 그대로 바꿔 끼우면 돼요).
    private void broadcast(Long pageId) {

        if (pageId == null) {
            return;
        }

        // 사람(userId)당 한 줄 — 같은 사람이 탭을 여러 개 열었으면 블록이 있는 쪽을 우선해요.
        Map<Long, Long> byUser = new LinkedHashMap<>();

        for (View view : views.values()) {
            if (pageId.equals(view.pageId())) {
                byUser.merge(view.userId(), view.blockId() == null ? -1L : view.blockId(),
                    (a, b) -> b != -1L ? b : a);
            }
        }

        if (byUser.isEmpty()) {
            return;
        }

        List<Map<String, Object>> viewers = new ArrayList<>();

        for (Map.Entry<Long, Long> entry : byUser.entrySet()) {
            Map<String, Object> viewer = new HashMap<>();
            viewer.put("userId", entry.getKey());
            viewer.put("blockId", entry.getValue() == -1L ? null : entry.getValue());
            viewers.add(viewer);
        }

        Map<String, Object> data = Map.of("pageId", pageId, "viewers", viewers);
        Set<Long> targets = new HashSet<>(byUser.keySet());

        for (Long userId : targets) {
            socketHandler.sendToUser(userId, SOCKET_TYPE_PAGE_PRESENCE, data);
        }
    }
}
