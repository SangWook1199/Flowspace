package com.flowspace.websocket;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

// 로그인한 사용자의 WebSocket 연결을 들고 있다가, 서버가 보낼 알림을 그 사용자에게 밀어줘요.
// 한 사용자가 탭을 여러 개 열 수 있어서 사용자당 연결을 여러 개 가져요.
// 나중에 실시간 커서처럼 다른 실시간 기능도 이 연결을 같이 쓸 수 있어요.
@Slf4j
@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    // 핸드셰이크(JwtHandshakeInterceptor)가 토큰을 검증해서 넣어둔 사용자 id의 속성 이름
    public static final String USER_ID_ATTRIBUTE = "userId";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<Long, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {

        Object userId = session.getAttributes().get(USER_ID_ATTRIBUTE);

        if (!(userId instanceof Long id)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        sessions.computeIfAbsent(id, key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {

        Object userId = session.getAttributes().get(USER_ID_ATTRIBUTE);

        if (userId instanceof Long id) {
            Set<WebSocketSession> set = sessions.get(id);

            if (set != null) {
                set.remove(session);

                if (set.isEmpty()) {
                    sessions.remove(id, set);
                }
            }
        }
    }

    // 클라이언트가 연결 유지용으로 "ping"을 보내면 "pong"으로 답해요(프록시가 놀고 있는 연결을 끊지 않게).
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {

        if ("ping".equals(message.getPayload())) {
            send(session, "pong");
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        session.close(CloseStatus.SERVER_ERROR);
    }

    // 사용자의 모든 연결(탭)에 { "type": type, "data": data } 를 보내요. 연결이 없으면 아무것도 안 해요.
    public void sendToUser(Long userId, String type, Object data) {

        Set<WebSocketSession> set = sessions.get(userId);

        if (set == null || set.isEmpty()) {
            return;
        }

        String json;

        try {
            json = MAPPER.writeValueAsString(Map.of("type", type, "data", data));
        } catch (IOException e) {
            log.error("WebSocket 메시지를 만들지 못했어요. type={}", type, e);
            return;
        }

        for (WebSocketSession session : set) {
            send(session, json);
        }
    }

    // 지금 연결돼 있는 사용자인지
    public boolean isOnline(Long userId) {
        Set<WebSocketSession> set = sessions.get(userId);
        return set != null && !set.isEmpty();
    }

    private void send(WebSocketSession session, String payload) {

        // 같은 세션에 동시에 보내면 Tomcat이 예외를 내서, 세션마다 한 번에 하나씩만 보내요.
        synchronized (session) {
            try {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(payload));
                }
            } catch (IOException e) {
                log.debug("WebSocket 전송 실패: {}", e.getMessage());
            }
        }
    }
}
