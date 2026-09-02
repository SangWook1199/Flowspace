package com.flowspace.exception;

public record ErrorResponse(
        int status,
        String message) {
    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(
                errorCode.getStatus().value(),
                errorCode.getMessage());
    }
}