package com.flowspace.dto.activity;

import java.time.LocalDateTime;

import com.flowspace.entity.Activity;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;

// @formatter:off

public record ActivityResponse(

    Long activityId,

    Long userId,
    String userName,
    Long profileFileId,

    ActivityType type,
    ActivityTargetType targetType,
    Long targetId,

    LocalDateTime createdAt

) {

    public static ActivityResponse from(Activity activity) {
        return new ActivityResponse(
            activity.getActivityId(),

            activity.getUser().getUserId(),
            activity.getUser().getNickname(),
            activity.getUser().getProfileFile() == null
                ? null
                : activity.getUser().getProfileFile().getFileId(),

            activity.getType(),
            activity.getTargetType(),
            activity.getTargetId(),

            activity.getCreatedAt()
        );
    }

}

// @formatter:on