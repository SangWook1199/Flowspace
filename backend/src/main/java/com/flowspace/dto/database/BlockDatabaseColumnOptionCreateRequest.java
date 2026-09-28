package com.flowspace.dto.database;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

// 컬럼 옵션 생성 요청 DTO
public record BlockDatabaseColumnOptionCreateRequest(

    @NotBlank(message = "옵션 값은 필수입니다.")
    @Size(max = 100, message = "옵션 값은 100자 이하입니다.")
    String value,

    // null이면 서비스에서 GRAY로 채워요(팔레트 순서 배정은 프론트에서 하고,
    // 여기는 넘어온 값을 그대로 저장해요).
    WorkspaceColor color,

    // STATUS 컬럼의 옵션에만 쓰고, SELECT/MULTI_SELECT는 null이에요.
    TaskStatusCategory statusGroup

) {
}

// @formatter:on
