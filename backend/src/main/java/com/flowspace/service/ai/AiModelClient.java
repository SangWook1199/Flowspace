package com.flowspace.service.ai;

import java.util.List;
import java.util.Map;

// AI 모델을 부르는 창구예요. 지금은 Ollama 하나뿐이지만, 인터페이스로 두면 테스트에서 가짜 모델을 끼울 수 있어요.
public interface AiModelClient {

    // role은 system / user / assistant
    record Message(String role, String content) {
    }

    // schema에 맞는 JSON 글자를 돌려받아요. 연결·시간 초과 같은 문제는 AiModelException으로 던져요.
    String chat(List<Message> messages, Map<String, Object> schema);

    // 모델 서버가 켜져 있고 설정한 모델이 내려받아져 있는지 확인해요.
    boolean isAvailable();
}
