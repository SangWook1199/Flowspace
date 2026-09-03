package com.flowspace.dto.workspace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.flowspace.entity.enums.WorkspaceColor;

// @formatter:off

// 워크스페이스 생성 요청 DTO
public record WorkspaceCreateRequest(

        @NotBlank(message = "워크스페이스 이름은 필수입니다.")
        @Size(max = 100, message = "워크스페이스 이름은 100자 이하입니다.")
        String name,

        @NotBlank(message = "이니셜은 필수입니다.")
        @Size(max = 4, message = "이니셜은 4자 이하입니다.")
        String initials,

        @NotNull(message = "색상은 필수입니다.")
        WorkspaceColor color
) {
}
