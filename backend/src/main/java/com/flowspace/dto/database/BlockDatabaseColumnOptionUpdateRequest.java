package com.flowspace.dto.database;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

// 컬럼 옵션 수정 요청 DTO
public record BlockDatabaseColumnOptionUpdateRequest(

    @NotBlank(message = "옵션 값은 필수입니다.")
    @Size(max = 100, message = "옵션 값은 100자 이하입니다.")
    String value,

    WorkspaceColor color,

    TaskStatusCategory statusGroup

) {
}

// @formatter:on
