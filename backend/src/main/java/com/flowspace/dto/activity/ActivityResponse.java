package com.flowspace.dto.activity;

import java.time.LocalDateTime;

import com.flowspace.entity.Activity;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;

// @formatter:off

// 활동 기록 응답 DTO
// targetName: 대상의 현재 이름(작업 제목·스프린트 이름·페이지 제목, 댓글이면 댓글이 달린 작업/페이지 이름 — 지워졌으면 null)
// targetLink: 눌렀을 때 이동할 화면 경로 (이동할 곳이 없으면 null)
public record ActivityResponse(

    Long activityId,

    Long userId,
    String userName,
    Long profileFileId,
    String profileImageUrl,

    ActivityType type,
    ActivityTargetType targetType,
    Long targetId,
    String targetName,
    String targetLink,

    LocalDateTime createdAt

) {

    public static ActivityResponse from(Activity activity) {
        return from(activity, null, null);
    }

    public static ActivityResponse from(Activity activity, String targetName, String targetLink) {
        return new ActivityResponse(
            activity.getActivityId(),

            activity.getUser().getUserId(),
            activity.getUser().getNickname(),
            activity.getUser().getProfileFile() == null
                ? null
                : activity.getUser().getProfileFile().getFileId(),
            activity.getUser().getProfileFile() == null
                ? null
                : activity.getUser().getProfileFile().getFileUrl(),

            activity.getType(),
            activity.getTargetType(),
            activity.getTargetId(),
            targetName,
            targetLink,

            activity.getCreatedAt()
        );
    }

}

// @formatter:on
