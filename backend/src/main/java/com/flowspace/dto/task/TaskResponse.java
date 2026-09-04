package com.flowspace.dto.task;

import com.flowspace.entity.Task;
import com.flowspace.entity.enums.TaskPriority;

import java.time.LocalDate;
import java.time.LocalDateTime;

// @formatter:off

// Task 응답 DTO
public record TaskResponse(

    Long taskId,
    Long workspaceId,
    Long sprintId,

    Long statusId,
    String statusName,

    Long assigneeId,

    String description,

    LocalDate startDate,
    LocalDate endDate,

    TaskPriority priority,

    LocalDateTime completedAt,
    LocalDateTime createdAt

) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
            task.getTaskId(),
            task.getWorkspace().getWorkspaceId(),
            task.getSprint() == null ? null : task.getSprint().getSprintId(),
            task.getStatus().getStatusId(),
            task.getStatus().getName(),
            task.getAssignee() == null ? null : task.getAssignee().getUserId(),
            task.getDescription(),
            task.getStartDate(),
            task.getEndDate(),
            task.getPriority(),
            task.getCompletedAt(),
            task.getCreatedAt()
        );
    }
}

// @formatter:on