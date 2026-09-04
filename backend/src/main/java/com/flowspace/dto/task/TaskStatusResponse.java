package com.flowspace.dto.task;

import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;

import java.time.LocalDateTime;

// @formatter:off

// Task 상태 응답 DTO
public record TaskStatusResponse(

    Long statusId,
    Long workspaceId,
    String name,
    TaskStatusCategory category,
    WorkspaceColor color,
    Integer position,
    LocalDateTime createdAt

) {

    public static TaskStatusResponse from(TaskStatus status) {
        return new TaskStatusResponse(
            status.getStatusId(),
            status.getWorkspace().getWorkspaceId(),
            status.getName(),
            status.getCategory(),
            status.getColor(),
            status.getPosition(),
            status.getCreatedAt()
        );
    }
}

// @formatter:on