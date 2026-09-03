package com.flowspace.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Auth
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    INVALID_LOGIN(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),

    // Workspace
    WORKSPACE_NOT_FOUND(HttpStatus.NOT_FOUND, "워크스페이스를 찾을 수 없습니다."), ACCESS_DENIED(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    ALREADY_WORKSPACE_MEMBER(HttpStatus.CONFLICT, "이미 워크스페이스 멤버입니다."),
    ALREADY_INVITED(HttpStatus.CONFLICT, "이미 초대가 진행 중입니다."), INVITE_NOT_FOUND(HttpStatus.NOT_FOUND, "초대를 찾을 수 없습니다."),
    INVALID_INVITE_STATUS(HttpStatus.BAD_REQUEST, "이미 처리된 초대입니다."),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없습니다."),
    OWNER_CANNOT_REMOVE(HttpStatus.BAD_REQUEST, "OWNER는 추방할 수 없습니다."),
    OWNER_CANNOT_LEAVE(HttpStatus.BAD_REQUEST, "OWNER는 워크스페이스를 나갈 수 없습니다.");

    private final HttpStatus status;
    private final String message;
}