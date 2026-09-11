package com.flowspace.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

public record SubTaskCreateRequest(
    Long assigneeId,

    @NotBlank(message = "내용은 필수입니다.")
    @Size(max = 300, message = "내용은 300자 이하입니다.")
    String content

) {}

// @formatter:on