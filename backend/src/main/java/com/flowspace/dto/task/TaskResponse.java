package com.flowspace.dto.task;

import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.entity.SubTask;
import com.flowspace.entity.Task;
import com.flowspace.entity.enums.TaskPriority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// @formatter:off

// Task 응답 DTO
public record TaskResponse(

    Long taskId,
    Long workspaceId,
    Long sprintId,

    Long statusId,
    String statusName,

    BigDecimal position,

    Long assigneeId,

    String description,

    LocalDate startDate,
    LocalDate endDate,

    TaskPriority priority,

    LocalDateTime completedAt,
    LocalDateTime createdAt,

    List<SubTaskResponse> subtasks,
    List<CommentResponse> comments

) {

    public static TaskResponse from(
        Task task, 
        List<SubTask> subtasks, 
        List<CommentResponse> comments
    ) {
        return new TaskResponse(
            task.getTaskId(),
            task.getWorkspace().getWorkspaceId(),
            task.getSprint() == null ? null : task.getSprint().getSprintId(),
            task.getStatus().getStatusId(),
            task.getStatus().getName(),
            task.getPosition(),
            task.getAssignee() == null ? null : task.getAssignee().getUserId(),
            task.getDescription(),
            task.getStartDate(),
            task.getEndDate(),
            task.getPriority(),
            task.getCompletedAt(),
            task.getCreatedAt(),
            subtasks.stream()
                .map(SubTaskResponse::from)
                .toList(),
            comments
        );
    }
}

// @formatter:on