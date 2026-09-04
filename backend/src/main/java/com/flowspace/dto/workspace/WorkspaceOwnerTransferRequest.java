package com.flowspace.dto.workspace;

import jakarta.validation.constraints.NotNull;

// @formatter:off

// 워크스페이스 소유권 이전 요청 DTO
public record WorkspaceOwnerTransferRequest(

  @NotNull(message = "사용자 ID는 필수입니다.")
  Long userId
) {
}

// @formatter:on