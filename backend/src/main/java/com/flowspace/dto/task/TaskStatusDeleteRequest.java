package com.flowspace.dto.task;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// Task 상태 삭제 요청 DTO
public record TaskStatusDeleteRequest(

    @NotNull(message = "이동할 상태는 필수입니다.")
    Long targetStatusId

) { }

// @formatter:on