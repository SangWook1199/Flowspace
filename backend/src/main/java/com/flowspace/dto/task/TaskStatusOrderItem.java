package com.flowspace.dto.task;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// Task 상태 순서 변경 항목 DTO
public record TaskStatusOrderItem(

    @NotNull(message = "상태 ID는 필수입니다.")
    Long statusId,

    @NotNull(message = "순서는 필수입니다.")
    Integer position

) {
}

// @formatter:on