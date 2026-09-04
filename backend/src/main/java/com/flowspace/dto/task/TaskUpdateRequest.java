package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskPriority;

import java.time.LocalDate;

// @formatter:off

// Task 수정 요청 DTO
public record TaskUpdateRequest(

    Long sprintId,      // null = Backlog

    Long assigneeId,

    Long statusId,

    String description,

    LocalDate startDate,

    LocalDate endDate,

    TaskPriority priority

) { }

// @formatter:on