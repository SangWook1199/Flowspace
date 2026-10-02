package com.flowspace.dto.notification;

import com.flowspace.entity.Notification;
import com.flowspace.entity.enums.NotificationType;

// @formatter:off

// 알림 응답 DTO (WebSocket으로 보내는 알림도 같은 모양이에요. createdAt은 ISO 문자열이에요.)
public record NotificationResponse(

    Long notificationId,
    NotificationType type,
    String message,

    Long workspaceId,
    String workspaceName,

    Long actorId,
    String actorName,

    Long refId,
    String linkPath,

    boolean read,
    String createdAt

) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
            notification.getNotificationId(),
            notification.getType(),
            notification.getMessage(),

            notification.getWorkspace() == null ? null : notification.getWorkspace().getWorkspaceId(),
            notification.getWorkspace() == null ? null : notification.getWorkspace().getName(),

            notification.getActor() == null ? null : notification.getActor().getUserId(),
            notification.getActor() == null ? null : notification.getActor().getNickname(),

            notification.getRefId(),
            notification.getLinkPath(),

            Boolean.TRUE.equals(notification.getIsRead()),
            notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString()
        );
    }

}

// @formatter:on
