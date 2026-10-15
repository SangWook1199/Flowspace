package com.flowspace.service.ai;

// 모델이 만든 초안이 쓸 수 없을 만큼 틀렸을 때 던져요(예: 스프린트가 모자람, 작업이 하나도 없음).
// 메시지는 모델에게 "이게 틀렸으니 다시 만들어"라고 돌려줄 때 그대로 써요.
public class AiDraftException extends RuntimeException {

    public AiDraftException(String message) {
        super(message);
    }
}
