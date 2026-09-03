package com.flowspace.dto.sprint;

import com.flowspace.entity.enums.SprintStatus;
import jakarta.validation.constraints.NotNull;

// @formatter:off

// 스프린트 상태 변경 요청 DTO
public record SprintStatusUpdateRequest(

  @NotNull(message = "상태는 필수입니다.")
  SprintStatus status
) {
}

// @formatter:on