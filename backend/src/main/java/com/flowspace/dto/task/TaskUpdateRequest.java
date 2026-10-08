package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

// @formatter:off

// Task 수정 요청 DTO
public record TaskUpdateRequest(

    Long sprintId,      // null = Backlog

    List<Long> assigneeIds,

    @NotNull(message = "상태는 필수입니다.")
    Long statusId,

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 200, message = "제목은 200자 이하입니다.")
    String title,

    @Size(max = 20000, message = "설명이 너무 깁니다.")
    String description,

    LocalDate startDate,

    LocalDate endDate,

    @NotNull(message = "우선순위는 필수입니다.")
    TaskPriority priority

) { }

// @formatter:on