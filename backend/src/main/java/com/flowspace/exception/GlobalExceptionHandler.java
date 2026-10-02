package com.flowspace.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(FlowSpaceException.class)
    public ResponseEntity<ErrorResponse> handleFlowSpaceException(
            FlowSpaceException e) {
        ErrorCode code = e.getErrorCode();

        return ResponseEntity
                .status(code.getStatus())
                .body(ErrorResponse.of(code));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException e) {

        String message = e.getBindingResult()
                .getFieldErrors()
                .getFirst()
                .getDefaultMessage();

        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR", message));
    }

    // 예상하지 못한 서버 오류(DB 오류, NPE 등). 이 핸들러가 없으면 오류가 /error로 넘어가면서
    // Spring Security가 "인증이 필요합니다"(401)로 덮어써서 진짜 원인이 가려져요. 원인은 서버 로그에 남겨요.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception e) throws Exception {

        // 인증·인가 예외는 Spring Security가 처리하게 그대로 넘겨요.
        if (e instanceof AccessDeniedException || e instanceof AuthenticationException) {
            throw e;
        }

        // 잘못된 URL·메서드·요청 본문처럼 Spring이 이미 알맞은 상태 코드를 알고 있는 오류는 그 코드를 지켜요.
        if (e instanceof org.springframework.web.ErrorResponse framework) {
            HttpStatus status = HttpStatus.valueOf(framework.getStatusCode().value());
            return ResponseEntity.status(status)
                    .body(new ErrorResponse(status.value(), status.name(), status.getReasonPhrase()));
        }

        log.error("처리되지 않은 서버 오류", e);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "INTERNAL_SERVER_ERROR", "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요."));
    }
}