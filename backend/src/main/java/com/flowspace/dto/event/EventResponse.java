package com.flowspace.dto.event;

import com.flowspace.entity.Event;
import com.flowspace.entity.enums.WorkspaceColor;

import java.time.LocalDateTime;

// @formatter:off

public record EventResponse(

    Long eventId,
    Long workspaceId,

    String title,
    String description,

    WorkspaceColor color,

    LocalDateTime startDatetime,
    LocalDateTime endDatetime,

    String createdByName,

    LocalDateTime createdAt

) {

    public static EventResponse from(Event event) {
        return new EventResponse(
            event.getEventId(),
            event.getWorkspace().getWorkspaceId(),
            event.getTitle(),
            event.getDescription(),
            event.getColor(),
            event.getStartDatetime(),
            event.getEndDatetime(),
            event.getCreatedBy().getName(),
            event.getCreatedAt()
        );
    }

}

// @formatter:on