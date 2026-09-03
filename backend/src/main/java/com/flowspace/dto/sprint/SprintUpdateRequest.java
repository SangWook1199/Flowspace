package com.flowspace.dto.sprint;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

// @formatter:off

// 스프린트 수정 요청 DTO
public record SprintUpdateRequest(

  @NotBlank(message = "스프린트 이름은 필수입니다.")
  @Size(max = 100, message = "이름은 100자 이하입니다.")
  String name,

  @Size(max = 500, message = "목표는 500자 이하입니다.")
  String goal,

  @Size(max = 1000, message = "설명은 1000자 이하입니다.")
  String description,

  @NotBlank(message = "색상은 필수입니다.")
  String color,

  @NotNull(message = "시작일은 필수입니다.")
  LocalDate startDate,

  @NotNull(message = "종료일은 필수입니다.")
  LocalDate endDate
) {
}

// @formatter:on