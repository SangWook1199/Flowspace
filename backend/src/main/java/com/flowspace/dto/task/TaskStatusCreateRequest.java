package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// Task 상태 생성 요청 DTO
public record TaskStatusCreateRequest(

    @NotBlank(message = "상태 이름은 필수입니다.")
    @Size(max = 50, message = "이름은 50자 이하입니다.")
    String name,

    @NotNull(message = "범주는 필수입니다.")
    TaskStatusCategory category,

    @NotNull(message = "색상은 필수입니다.")
    WorkspaceColor color

) {
}

// @formatter:on