package com.flowspace.dto.task;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// Task 상태 변경 요청 DTO
public record TaskStatusUpdateRequest(

    @NotNull(message = "상태는 필수입니다.")
    Long statusId

) { }

// @formatter:on