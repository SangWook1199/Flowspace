package com.flowspace.dto.sprint;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.enums.SprintStatus;
import com.flowspace.entity.enums.WorkspaceColor;

import java.time.LocalDate;
import java.time.LocalDateTime;

// @formatter:off

// 스프린트 응답 DTO
public record SprintResponse(

    Long sprintId,

    Long workspaceId,

    Long createdBy,

    String name,

    String goal,

    String description,

    WorkspaceColor color,

    LocalDate startDate,

    LocalDate endDate,

    SprintStatus status,

    Integer progress,

    Integer taskCount,

    Integer completedTaskCount,

    LocalDateTime createdAt,

    Boolean isBacklog

) {

    public static SprintResponse from(
            Sprint sprint,
            Integer progress,
            Integer taskCount,
            Integer completedTaskCount) {

        return new SprintResponse(
            sprint.getSprintId(),
            sprint.getWorkspace().getWorkspaceId(),
            sprint.getCreatedBy().getUserId(),
            sprint.getName(),
            sprint.getGoal(),
            sprint.getDescription(),
            sprint.getColor(),
            sprint.getStartDate(),
            sprint.getEndDate(),
            sprint.getStatus(),
            progress,
            taskCount,
            completedTaskCount,
            sprint.getCreatedAt(),
            false
        );
    }

    public static SprintResponse backlog(
            Long workspaceId,
            Integer taskCount) {

        return new SprintResponse(
            null,
            workspaceId,
            null,
            "Backlog",
            null,
            null,
            WorkspaceColor.GRAY,
            null,
            null,
            null,
            0,
            taskCount,
            0,
            null,
            true
        );
    }
}

// @formatter:on