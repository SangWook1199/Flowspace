package com.flowspace.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.flowspace.websocket.JwtHandshakeInterceptor;
import com.flowspace.websocket.NotificationWebSocketHandler;

import lombok.RequiredArgsConstructor;

// WebSocket 연결 주소: ws://서버/ws?token=<accessToken>
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    // REST의 CORS와 같은 설정을 써요(여러 개면 쉼표로 구분).
    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(notificationWebSocketHandler, "/ws")
            .addInterceptors(jwtHandshakeInterceptor)
            .setAllowedOrigins(allowedOrigins.split(","));
    }
}
