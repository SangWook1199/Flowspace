package com.flowspace.websocket;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import com.flowspace.security.JwtProvider;

import lombok.RequiredArgsConstructor;

// 브라우저의 WebSocket은 요청 헤더(Authorization)를 못 붙여서, 주소의 ?token=<accessToken>으로 받아 검증해요.
// 토큰이 없거나 틀리면 연결 자체를 거절해요(401).
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
        Map<String, Object> attributes) {

        String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");

        if (token == null || token.isBlank() || !jwtProvider.isAccessToken(token)) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        attributes.put(NotificationWebSocketHandler.USER_ID_ATTRIBUTE, jwtProvider.getUserId(token));
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
        Exception exception) {
        // 할 일 없음
    }
}
