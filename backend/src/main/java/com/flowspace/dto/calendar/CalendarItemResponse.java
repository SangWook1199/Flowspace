package com.flowspace.dto.calendar;

import com.flowspace.entity.Event;
import com.flowspace.entity.Task;
import com.flowspace.entity.enums.WorkspaceColor;

import java.time.LocalDateTime;

// @formatter:off

public record CalendarItemResponse(

    Long id,
    String type,

    String title,

    WorkspaceColor color,

    LocalDateTime startDatetime,
    LocalDateTime endDatetime,

    Long sprintId,
    Long statusId,
    Long assigneeId

) {

    public static CalendarItemResponse from(Task task) {
        return new CalendarItemResponse(
            task.getTaskId(),
            "TASK",
            task.getDescription(),
            task.getStatus().getColor(),
            task.getStartDate().atStartOfDay(),
            task.getEndDate() == null ? null : task.getEndDate().atTime(23, 59),
            task.getSprint() == null ? null : task.getSprint().getSprintId(),
            task.getStatus().getStatusId(),
            task.getAssignee() == null ? null : task.getAssignee().getUserId()
        );
    }

    public static CalendarItemResponse from(Event event) {
        return new CalendarItemResponse(
            event.getEventId(),
            "EVENT",
            event.getTitle(),
            event.getColor(),
            event.getStartDatetime(),
            event.getEndDatetime(),
            null,
            null,
            null
        );
    }

}

// @formatter:on