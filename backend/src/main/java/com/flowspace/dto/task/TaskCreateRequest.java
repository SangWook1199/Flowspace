package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskPriority;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

// @formatter:off

// Task 생성 요청 DTO
public record TaskCreateRequest(
    Long assigneeId,

    @NotNull(message = "상태는 필수입니다.")
    Long statusId,

    @Size(max = 1000, message = "설명은 1000자 이하입니다.")
    String description,

    LocalDate startDate,

    LocalDate endDate,

    @NotNull(message = "우선순위는 필수입니다.")
    TaskPriority priority

) { }

// @formatter:on