package com.flowspace.service.ai;

// 모델 서버에 연결하지 못했거나 응답이 오지 않았을 때 던져요. 메시지는 사용자에게 그대로 보여줘도 돼요.
public class AiModelException extends RuntimeException {

    public AiModelException(String message) {
        super(message);
    }
}
