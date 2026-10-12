package com.flowspace.service.ai;

// 사용자가 취소해서 초안 만들기를 멈출 때 던져요.
public class AiJobCancelledException extends RuntimeException {

    public AiJobCancelledException() {
        super("취소했어요.");
    }
}
