package com.flowspace.dto.ai;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonCreator;
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
    LocalDate endDate,

    // 작업의 기본적인 단계예요. 없으면 빈 목록이에요(하위 작업 없이 만들어요).
    @Size(max = AiDraftLimits.MAX_SUBTASKS_PER_TASK, message = "하위 작업은 작업마다 8개까지 만들 수 있어요.")
    List<@NotBlank(message = "하위 작업 내용은 비워 둘 수 없어요.") @Size(max = AiDraftLimits.MAX_SUBTASK_CONTENT, message = "하위 작업은 300자 이하입니다.") String> subtasks
  ) {

    // 하위 작업이 오지 않거나(옛 화면, 서버가 날짜만 정한 작업) null이 섞여 와도 항상 읽을 수 있는 목록으로 둬요.
    @JsonCreator
    public Task {
      subtasks = subtasks == null ? List.of() : subtasks.stream().filter(Objects::nonNull).toList();
    }

    // 하위 작업 없이 만들 때 쓰는 생성자예요.
    public Task(String title, String description, TaskPriority priority, Long assigneeUserId, LocalDate startDate,
      LocalDate endDate) {
      this(title, description, priority, assigneeUserId, startDate, endDate, List.of());
    }
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
