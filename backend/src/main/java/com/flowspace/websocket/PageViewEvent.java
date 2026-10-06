package com.flowspace.websocket;

// 클라이언트가 "지금 이 페이지를 보고 있어요 / 이 블록을 편집 중이에요"라고 알려왔을 때 발행하는 이벤트
//  - pageId가 null이면 페이지를 떠났다는 뜻이에요.
//  - blockId는 편집 중인 블록(서버 blockId). 아직 어느 블록에도 커서가 없으면 null이에요.
public record PageViewEvent(String sessionId, Long userId, Long pageId, Long blockId) {
}
