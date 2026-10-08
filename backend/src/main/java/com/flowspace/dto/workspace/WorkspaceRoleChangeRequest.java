package com.flowspace.dto.workspace;

import com.flowspace.entity.enums.WorkspaceRole;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 멤버 역할 변경 요청 DTO (ADMIN 또는 MEMBER만 지정할 수 있어요. 소유권은 소유권 이전으로만 바꿔요.)
public record WorkspaceRoleChangeRequest(

    @NotNull(message = "역할을 선택해 주세요.")
    WorkspaceRole role

) {}

// @formatter:on
