package com.flowspace.dto.task;

import com.flowspace.entity.Task;

// @formatter:off

// Task 검색 응답 DTO
public record TaskSearchResponse(

    Long taskId,
    String description,
    Long statusId,
    String statusName,
    Long assigneeId,
    String assigneeName

) {

    public static TaskSearchResponse from(Task task) {
        return new TaskSearchResponse(
            task.getTaskId(),
            task.getDescription(),
            task.getStatus().getStatusId(),
            task.getStatus().getName(),
            task.getAssignee() == null ? null : task.getAssignee().getUserId(),
            task.getAssignee() == null ? null : task.getAssignee().getName()
        );
    }

}

// @formatter:on