package com.flowspace.dto.ai;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// "AI 프로젝트 자동 구성" 입력폼이에요. 필수는 주제·기간·스프린트 길이·멤버별 역할이고, 나머지는 있으면 결과가 더 좋아져요.
public record AiProjectRequest(

  @NotBlank(message = "프로젝트 주제는 필수입니다.")
  @Size(max = 200, message = "주제는 200자 이하입니다.")
  String topic,

  @NotNull(message = "시작일은 필수입니다.")
  LocalDate startDate,

  @NotNull(message = "종료일은 필수입니다.")
  LocalDate endDate,

  @NotNull(message = "스프린트 길이는 필수입니다.")
  @Min(value = 1, message = "스프린트는 1주 이상입니다.")
  @Max(value = 3, message = "스프린트는 3주 이하입니다.")
  Integer sprintWeeks,

  @NotEmpty(message = "멤버를 한 명 이상 골라 주세요.")
  @Size(max = 20, message = "멤버는 20명까지 고를 수 있어요.")
  List<@Valid Member> members,

  @Size(max = 1000, message = "핵심 기능·목표는 1000자 이하입니다.")
  String features,

  @Size(max = 300, message = "기술 스택은 300자 이하입니다.")
  String techStack,

  @Size(max = 20, message = "고정 일정은 20개까지 넣을 수 있어요.")
  List<@Valid FixedEvent> fixedEvents,

  @Size(max = 50, message = "프로젝트 유형은 50자 이하입니다.")
  String projectType,

  @Size(max = 300, message = "팀 경험은 300자 이하입니다.")
  String teamExperience,

  @Size(max = 500, message = "제외할 것은 500자 이하입니다.")
  String exclusions
) {

  // 일을 맡을 멤버와 그 사람의 역할(예: 백엔드, 디자인)이에요.
  public record Member(

    @NotNull(message = "멤버는 필수입니다.")
    Long userId,

    @NotBlank(message = "멤버의 역할은 필수입니다.")
    @Size(max = 100, message = "역할은 100자 이하입니다.")
    String role
  ) {
  }

  // 날짜가 이미 정해진 일정(예: 중간 발표)이에요. AI가 건드리지 않고 그대로 이벤트가 돼요.
  public record FixedEvent(

    @NotBlank(message = "일정 제목은 필수입니다.")
    @Size(max = AiDraftLimits.MAX_TITLE, message = "제목은 200자 이하입니다.")
    String title,

    @NotNull(message = "일정 날짜는 필수입니다.")
    LocalDate date
  ) {
  }
}

// @formatter:on
