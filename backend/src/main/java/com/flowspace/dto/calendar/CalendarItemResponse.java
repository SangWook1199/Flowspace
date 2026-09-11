package com.flowspace.dto.calendar;

import com.flowspace.dto.task.AssigneeItem;
import com.flowspace.entity.Event;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.enums.WorkspaceColor;

import java.time.LocalDateTime;
import java.util.List;

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

    List<AssigneeItem> assignees

) {

    public static CalendarItemResponse from(
        Task task,
        List<TaskAssignee> assignees
    ) {
        return new CalendarItemResponse(
            task.getTaskId(),
            "TASK",
            task.getTitle(),
            task.getStatus().getColor(),
            task.getStartDate().atStartOfDay(),
            task.getEndDate() == null ? null : task.getEndDate().atTime(23, 59),
            task.getSprint() == null ? null : task.getSprint().getSprintId(),
            task.getStatus().getStatusId(),
            assignees.stream()
                .map(AssigneeItem::from)
                .toList()
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
            List.of()
        );
    }

}

// @formatter:on