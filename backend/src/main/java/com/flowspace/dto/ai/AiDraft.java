package com.flowspace.dto.ai;

import java.time.LocalDate;
import java.util.List;

import com.flowspace.entity.enums.TaskPriority;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// 서버가 검증하고 날짜까지 계산한 프로젝트 초안이에요.
// 미리보기로 내려주고, 사용자가 고친 최종본을 "만들기" 요청으로 다시 받아요.
public record AiDraft(

  @NotNull(message = "스프린트는 필수입니다.")
  @Size(min = 1, max = AiDraftLimits.MAX_SPRINTS, message = "스프린트는 1개 이상 12개 이하로 만들 수 있어요.")
  List<@Valid Sprint> sprints,

  @NotNull(message = "이벤트 목록은 필수입니다.")
  @Size(max = AiDraftLimits.MAX_EVENTS, message = "이벤트는 20개까지 만들 수 있어요.")
  List<@Valid Event> events
) {

  public record Sprint(

    @NotBlank(message = "스프린트 이름은 필수입니다.")
    @Size(max = AiDraftLimits.MAX_SPRINT_NAME, message = "이름은 100자 이하입니다.")
    String name,

    @Size(max = AiDraftLimits.MAX_GOAL, message = "목표는 500자 이하입니다.")
    String goal,

    @NotNull(message = "시작일은 필수입니다.")
    LocalDate startDate,

    @NotNull(message = "종료일은 필수입니다.")
    LocalDate endDate,

    @NotNull(message = "작업 목록은 필수입니다.")
    @Size(max = AiDraftLimits.MAX_TASKS_PER_SPRINT, message = "스프린트마다 작업은 15개까지 만들 수 있어요.")
    List<@Valid Task> tasks
  ) {
  }

  public record Task(

    @NotBlank(message = "작업 제목은 필수입니다.")
    @Size(max = AiDraftLimits.MAX_TITLE, message = "제목은 200자 이하입니다.")
    String title,

    @Size(max = AiDraftLimits.MAX_DESCRIPTION, message = "설명이 너무 깁니다.")
    String description,

    @NotNull(message = "우선순위는 필수입니다.")
    TaskPriority priority,

    // 담당자가 없으면 비워 둬요.
    Long assigneeUserId,

    @NotNull(message = "시작일은 필수입니다.")
    LocalDate startDate,

    @NotNull(message = "종료일은 필수입니다.")
    LocalDate endDate
  ) {
  }

  public record Event(

    @NotBlank(message = "이벤트 제목은 필수입니다.")
    @Size(max = AiDraftLimits.MAX_TITLE, message = "제목은 200자 이하입니다.")
    String title,

    @NotNull(message = "이벤트 날짜는 필수입니다.")
    LocalDate date
  ) {
  }
}

// @formatter:on
