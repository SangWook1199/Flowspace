package com.flowspace.service.ai;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

// AI 모델을 부르는 창구예요. 지금은 Ollama 하나뿐이지만, 인터페이스로 두면 테스트에서 가짜 모델을 끼울 수 있어요.
public interface AiModelClient {

    // role은 system / user / assistant
    record Message(String role, String content) {
    }

    // schema에 맞는 JSON 글자를 돌려받아요. 연결·시간 초과 같은 문제는 AiModelException으로 던져요.
    String chat(List<Message> messages, Map<String, Object> schema);

    // chat과 같지만, 모델이 글을 쓰는 동안 "지금까지 받은 글 전체"를 onPartial로 알려줘요(진행 상황을 보여주려는 거예요).
    // onPartial에서 예외를 던지면 받기를 멈춰요(취소할 때 써요). 실시간으로 받지 못하는 클라이언트는 끝에 한 번만 알려도 돼요.
    default String chat(List<Message> messages, Map<String, Object> schema, Consumer<String> onPartial) {
        String content = chat(messages, schema);
        onPartial.accept(content);

        return content;
    }

    // 모델 서버가 켜져 있고 설정한 모델이 내려받아져 있는지 확인해요.
    boolean isAvailable();
}
