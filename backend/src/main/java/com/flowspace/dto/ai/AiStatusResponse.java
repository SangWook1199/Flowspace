package com.flowspace.dto.ai;

// AI 기능을 지금 쓸 수 있는지 화면에 알려줘요(꺼져 있거나 Ollama가 꺼져 있으면 버튼을 숨겨요).
public record AiStatusResponse(boolean enabled, boolean available, String model) {
}
