package com.flowspace.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Auth
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    SOCIAL_EMAIL_CONFLICT(HttpStatus.CONFLICT, "이미 이 이메일로 가입된 계정이 있어요. 처음 가입했던 방식(이메일 또는 다른 소셜 계정)으로 로그인해주세요."),
    SOCIAL_EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "이메일이 인증되지 않은 Google 계정으로는 로그인할 수 없어요."),
    SOCIAL_LINK_REQUIRED(HttpStatus.CONFLICT, "이미 이 이메일로 가입된 계정이 있어요. 그 계정의 비밀번호를 입력하면 연결할 수 있어요."),
    SOCIAL_LINK_PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "비밀번호가 올바르지 않아요."),
    INVALID_RESET_TOKEN(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 비밀번호 찾기를 다시 해주세요."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    INVALID_LOGIN(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 유효하지 않습니다."),
    INVALID_CURRENT_PASSWORD(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다."),
    SAME_PASSWORD(HttpStatus.BAD_REQUEST, "새 비밀번호는 현재 비밀번호와 달라야 합니다."),
    PASSWORD_NOT_SET(HttpStatus.BAD_REQUEST, "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."),
    WITHDRAW_CONFIRM_MISMATCH(HttpStatus.BAD_REQUEST, "입력한 이메일이 계정 이메일과 다릅니다."),
    OWNED_WORKSPACE_HAS_MEMBERS(HttpStatus.CONFLICT, "다른 멤버가 있는 워크스페이스의 소유자는 탈퇴할 수 없습니다. 소유권을 넘기거나 멤버를 내보낸 뒤 다시 시도해주세요."),

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
    LAST_WORKSPACE(HttpStatus.BAD_REQUEST, "마지막 남은 워크스페이스는 삭제하거나 나갈 수 없습니다."),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),

    // Sprint
    SPRINT_NOT_FOUND(HttpStatus.NOT_FOUND, "스프린트를 찾을 수 없습니다."),
    INVALID_SPRINT_DATE(HttpStatus.BAD_REQUEST, "종료일은 시작일보다 빠를 수 없습니다."),
    SPRINT_ALREADY_ACTIVE(HttpStatus.CONFLICT, "이미 진행 중인 스프린트가 있어요. 먼저 완료한 뒤 시작해 주세요."),
    RETROSPECTIVE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 회고가 생성된 스프린트입니다."),

    // Task
    TASK_STATUS_NOT_FOUND(HttpStatus.NOT_FOUND, "Task 상태를 찾을 수 없습니다."),
    INVALID_TASK_STATUS(HttpStatus.BAD_REQUEST, "유효하지 않은 Task 상태입니다."),
    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "Task를 찾을 수 없습니다."),
    SUBTASK_NOT_FOUND(HttpStatus.NOT_FOUND, "서브태스크를 찾을 수 없습니다."),
    INVALID_SPRINT(HttpStatus.BAD_REQUEST, "유효하지 않은 스프린트입니다."),
    INVALID_SUBTASK_ASSIGNEE(HttpStatus.BAD_REQUEST, "SubTask 담당자는 Task 담당자 중에서만 선택할 수 있습니다."),
    LAST_TASK_STATUS_CANNOT_DELETE(HttpStatus.BAD_REQUEST, "마지막 남은 Task 상태는 삭제할 수 없습니다."),

    // Event
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "이벤트를 찾을 수 없습니다."),
    INVALID_EVENT_TIME(HttpStatus.BAD_REQUEST, "종료 시간은 시작 시간보다 빠를 수 없습니다."),

    // Page
    PAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "페이지를 찾을 수 없습니다."),
    INVALID_PAGE_PARENT(HttpStatus.BAD_REQUEST, "자기 자신을 부모 페이지로 지정할 수 없습니다."),
    INVALID_PAGE_REORDER(HttpStatus.BAD_REQUEST, "같은 상위 페이지에 속한 페이지만 순서를 바꿀 수 있습니다."),
    RETROSPECTIVE_PAGE_PROTECTED(HttpStatus.BAD_REQUEST, "회고 페이지는 영구 삭제할 수 없습니다."),
    BLOCK_NOT_FOUND(HttpStatus.NOT_FOUND, "블록을 찾을 수 없습니다."),
    INVALID_BLOCK_PARENT(HttpStatus.BAD_REQUEST, "자기 자신 또는 하위 블록으로 이동할 수 없습니다."),
    DATABASE_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스를 찾을 수 없습니다."),
    DATABASE_COLUMN_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 컬럼을 찾을 수 없습니다."),
    DATABASE_ROW_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 행을 찾을 수 없습니다."),
    DATABASE_CELL_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 셀을 찾을 수 없습니다."),
    DATABASE_OPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "데이터베이스 컬럼 옵션을 찾을 수 없습니다."),

    INVALID_BLOCK_CONTENT(HttpStatus.BAD_REQUEST, "블록 내용이 올바른 JSON 형식이 아닙니다."),
    INVALID_BLOCK_SYNC(HttpStatus.BAD_REQUEST, "블록 동기화 요청이 올바르지 않습니다."),
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