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
    OWNER_CANNOT_LEAVE(HttpStatus.BAD_REQUEST, "OWNER는 워크스페이스를 나갈 수 없습니다."),

    // Sprint
    SPRINT_NOT_FOUND(HttpStatus.NOT_FOUND, "스프린트를 찾을 수 없습니다."),
    INVALID_SPRINT_DATE(HttpStatus.BAD_REQUEST, "종료일은 시작일보다 빠를 수 없습니다."),
    RETROSPECTIVE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 회고가 생성된 스프린트입니다."),

    // Task
    TASK_STATUS_NOT_FOUND(HttpStatus.NOT_FOUND, "Task 상태를 찾을 수 없습니다."),
    INVALID_TASK_STATUS(HttpStatus.BAD_REQUEST, "유효하지 않은 Task 상태입니다."),
    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "Task를 찾을 수 없습니다."),
    SUBTASK_NOT_FOUND(HttpStatus.NOT_FOUND, "서브태스크를 찾을 수 없습니다."),
    INVALID_SPRINT(HttpStatus.BAD_REQUEST, "유효하지 않은 스프린트입니다."),
    INVALID_SUBTASK_ASSIGNEE(HttpStatus.BAD_REQUEST, "SubTask 담당자는 Task 담당자 중에서만 선택할 수 있습니다."),

    // Event
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "이벤트를 찾을 수 없습니다."),
    INVALID_EVENT_TIME(HttpStatus.BAD_REQUEST, "종료 시간은 시작 시간보다 빠를 수 없습니다."),

    // Page
    PAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "페이지를 찾을 수 없습니다."),
    INVALID_PAGE_PARENT(HttpStatus.BAD_REQUEST, "자기 자신을 부모 페이지로 지정할 수 없습니다."),
    BLOCK_NOT_FOUND(HttpStatus.NOT_FOUND, "블록을 찾을 수 없습니다."),
    INVALID_BLOCK_PARENT(HttpStatus.BAD_REQUEST, "자기 자신 또는 하위 블록으로 이동할 수 없습니다."),
    DATABASE_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스를 찾을 수 없습니다."),
    DATABASE_COLUMN_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 컬럼을 찾을 수 없습니다."),
    DATABASE_ROW_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 행을 찾을 수 없습니다."),
    DATABASE_CELL_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 셀을 찾을 수 없습니다."),

    // File
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 업로드에 실패했습니다."),
    FILE_DELETE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 삭제에 실패했습니다."),
    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다."),
    INVALID_IMAGE_FILE(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다."),

    // Retrospective
    RETROSPECTIVE_NOT_FOUND(HttpStatus.NOT_FOUND, "회고를 찾을 수 없습니다."),

    // Comment
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."),;

    private final HttpStatus status;
    private final String message;
}