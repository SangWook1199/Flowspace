package com.flowspace.exception;

// 에러 응답 DTO. code는 프론트가 메시지 문장 비교 없이 에러를 구분할 때 씁니다.
public record ErrorResponse(
        int status,
        String code,
        String message) {
    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(
                errorCode.getStatus().value(),
                errorCode.name(),
                errorCode.getMessage());
    }
}