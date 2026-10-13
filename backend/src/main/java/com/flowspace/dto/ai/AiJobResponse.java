package com.flowspace.dto.ai;

// 초안 만들기 작업의 현재 모습이에요. 화면이 주기적으로 물어보고(폴링), 완성되면 draft가 들어 있어요.
// progress는 만드는 중(RUNNING)일 때만 있고, 모델이 첫 글을 쓰기 전에는 null이에요.
public record AiJobResponse(
    String jobId,
    AiJobStatus status,
    int attempt,
    int maxAttempts,
    String message,
    AiDraft draft,
    String error,
    long elapsedSeconds,
    AiProgressInfo progress
) {
}
