package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskPriority;

import java.time.LocalDate;
import java.util.List;

// @formatter:off

// Task 수정 요청 DTO
public record TaskUpdateRequest(

    Long sprintId,      // null = Backlog

    List<Long> assigneeIds,

    Long statusId,

    String title,

    String description,

    LocalDate startDate,

    LocalDate endDate,

    TaskPriority priority

) { }

// @formatter:on