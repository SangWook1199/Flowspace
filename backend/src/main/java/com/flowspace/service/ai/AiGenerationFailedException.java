package com.flowspace.service.ai;

// 정해진 횟수만큼 다시 만들어 봤는데도 쓸 수 있는 초안이 나오지 않았을 때 던져요.
public class AiGenerationFailedException extends RuntimeException {

    public AiGenerationFailedException(String message) {
        super(message);
    }
}
