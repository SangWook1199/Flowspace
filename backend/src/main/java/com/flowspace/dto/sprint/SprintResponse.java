package com.flowspace.dto.sprint;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.enums.SprintStatus;

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
  String color,
  LocalDate startDate,
  LocalDate endDate,
  SprintStatus status,
  Integer progress,
  Integer taskCount,
  Integer completedTaskCount,
  LocalDateTime createdAt

) {

  public static SprintResponse from(Sprint sprint) {
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
      0,
      0,
      0,
      sprint.getCreatedAt()
    );
  }
}

// @formatter:on