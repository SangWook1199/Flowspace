package com.flowspace.entity.enums;

// 알림 종류
public enum NotificationType {
    // 워크스페이스
    WORKSPACE_INVITE,        // 워크스페이스 초대를 받음 (수락/거절 가능, refId = inviteId)
    INVITE_ACCEPTED,         // 내가 보낸 초대가 수락됨
    INVITE_DECLINED,         // 내가 보낸 초대가 거절됨
    MEMBER_LEFT,             // 멤버가 워크스페이스를 나감 (소유자에게)
    MEMBER_REMOVED,          // 워크스페이스에서 추방됨
    OWNERSHIP_TRANSFERRED,   // 소유권을 넘겨받음

    // 작업
    TASK_ASSIGNED,           // 작업 담당자로 지정됨
    TASK_STATUS_CHANGED,     // 내 담당 작업의 상태가 바뀜
    TASK_DUE_SOON,           // 내 담당 작업의 마감이 오늘/내일

    // 댓글
    COMMENT_CREATED,         // 내 작업·페이지·댓글에 댓글/답글이 달림
    COMMENT_MENTION,         // 댓글에서 멘션됨 (멘션 기능이 생기면 사용)

    // 스프린트
    SPRINT_STARTED,          // 스프린트가 시작됨
    SPRINT_COMPLETED         // 스프린트가 완료됨 (회고 생성)
}
