package com.flowspace.dto.workspace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.flowspace.entity.enums.WorkspaceColor;

// @formatter:off

// 워크스페이스 수정 요청 DTO (소유자 전용, 이름·이니셜·색·아이콘을 한 번에 바꿔요)
public record WorkspaceUpdateRequest(

        @NotBlank(message = "워크스페이스 이름은 필수입니다.")
        @Size(max = 100, message = "워크스페이스 이름은 100자 이하입니다.")
        String name,

        @NotBlank(message = "이니셜은 필수입니다.")
        @Size(max = 4, message = "이니셜은 4자 이하입니다.")
        String initials,

        @NotNull(message = "색상은 필수입니다.")
        WorkspaceColor color,

        // 비우면(null 또는 공백) 아이콘을 지우고 이니셜을 보여줘요.
        @Size(max = 20, message = "아이콘은 20자 이하입니다.")
        String icon
) {
}

// @formatter:on
