package com.flowspace.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.validation.ConstraintViolationException;

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

        // 필드 오류가 없고 객체 전체 오류만 있는 경우에도 안전하게 첫 메시지를 골라요.
        String message = e.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않아요.");

        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR", message));
    }

    // 업로드 크기 제한(spring.servlet.multipart)을 넘었을 때: 서버 오류가 아니라 "파일이 너무 커요"로 알려요.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleUploadTooLarge(MaxUploadSizeExceededException e) {
        ErrorCode code = ErrorCode.FILE_TOO_LARGE;

        return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code));
    }

    // 쿼리·경로 값 검증(@Min, @Size 등)에 걸렸을 때: 잘못된 요청이에요.
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR", "요청 값이 올바르지 않아요."));
    }

    // 요청 본문이 JSON이 아니거나 값 형식(날짜·enum 등)이 안 맞을 때, 주소의 숫자 자리에 글자가 올 때: 서버 오류가 아니라 잘못된 요청이에요.
    @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "BAD_REQUEST", "요청 형식이 올바르지 않아요."));
    }

    // 같은 값이 동시에 들어와 유일 제약에 걸렸을 때(더블클릭 등): 이미 처리된 요청으로 봐요.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException e) {
        log.warn("데이터 제약 위반: {}", e.getMostSpecificCause().getMessage());

        // 유일·외래 키 제약(중복, 이미 지워진 대상)이면 충돌로, 값이 너무 길다 같은 나머지는 잘못된 요청으로 답해요.
        if (e.getMostSpecificCause() instanceof java.sql.SQLIntegrityConstraintViolationException) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(409, "CONFLICT", "이미 처리됐거나 중복된 요청이에요. 새로고침한 뒤 다시 시도해주세요."));
        }

        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "BAD_REQUEST", "입력한 값이 너무 길거나 올바르지 않아요."));
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