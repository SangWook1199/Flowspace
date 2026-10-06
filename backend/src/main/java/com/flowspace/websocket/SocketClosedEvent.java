package com.flowspace.websocket;

// WebSocket 연결(탭 하나)이 닫혔을 때 발행하는 이벤트 — 그 탭이 보던 페이지 표시를 지우는 데 써요.
public record SocketClosedEvent(String sessionId) {
}
