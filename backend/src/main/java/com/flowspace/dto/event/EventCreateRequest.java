package com.flowspace.dto.event;

import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

// @formatter:off

public record EventCreateRequest(

    @NotBlank
    String title,

    String description,

    @NotNull
    WorkspaceColor color,

    @NotNull
    LocalDateTime startDatetime,

    LocalDateTime endDatetime

) {}

// @formatter:on