package com.flowspace.websocket;

// 사용자의 첫 WebSocket 연결이 열리거나(online=true), 마지막 연결이 닫혔을 때(online=false) 발행하는 이벤트
public record UserConnectionEvent(Long userId, boolean online) {
}
