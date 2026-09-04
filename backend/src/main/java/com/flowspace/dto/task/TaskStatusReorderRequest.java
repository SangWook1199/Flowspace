package com.flowspace.dto.task;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// @formatter:off

// Task 상태 순서 변경 요청 DTO
public record TaskStatusReorderRequest(

    @Valid
    @NotEmpty(message = "상태 목록은 비어 있을 수 없습니다.")
    List<TaskStatusOrderItem> statuses

) {
}

// @formatter:on