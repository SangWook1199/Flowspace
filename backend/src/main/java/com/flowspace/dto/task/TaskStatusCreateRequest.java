package com.flowspace.dto.task;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    WorkspaceColor color,

    // 비우면 WIP 제한 없음
    @Min(value = 1, message = "작업 수 제한은 1 이상이어야 합니다.")
    @Max(value = 999, message = "작업 수 제한은 999 이하여야 합니다.")
    Integer wipLimit

) {
}

// @formatter:on