package com.flowspace.exception;

import lombok.Getter;

@Getter
public class FlowSpaceException extends RuntimeException {

    private final ErrorCode errorCode;

    public FlowSpaceException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}