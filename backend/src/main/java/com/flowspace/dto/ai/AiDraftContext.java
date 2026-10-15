package com.flowspace.dto.ai;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// @formatter:off

// 초안을 검증·변환할 때 쓰는 기준이에요(사용자가 입력한 기간, 스프린트 길이, 멤버와 역할, 고정 일정).
// 스프린트가 몇 개이고 각각 언제인지는 사용자가 쓰지 않고, 기간과 길이로 서버가 계산해요.
public record AiDraftContext(
  LocalDate startDate,
  LocalDate endDate,
  int sprintWeeks,
  Map<Long, String> memberRoles,
  List<FixedEvent> fixedEvents
) {

  // 날짜가 이미 정해진 일정(예: 중간 발표)이에요. AI를 거치지 않고 그대로 이벤트가 돼요.
  public record FixedEvent(String title, LocalDate date) {
  }

  // 역할을 모르는 멤버 목록으로 만들 때예요(역할로 담당자를 바로잡는 단계는 건너뛰어요).
  public AiDraftContext(LocalDate startDate, LocalDate endDate, int sprintWeeks, Set<Long> memberIds, List<FixedEvent> fixedEvents) {
    this(startDate, endDate, sprintWeeks, rolesUnknown(memberIds), fixedEvents);
  }

  private static Map<Long, String> rolesUnknown(Set<Long> memberIds) {
    Map<Long, String> roles = new LinkedHashMap<>();

    if (memberIds != null) {
      memberIds.forEach(id -> roles.put(id, ""));
    }

    return roles;
  }

  public AiDraftContext {
    if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
      throw new FlowSpaceException(ErrorCode.INVALID_SPRINT_DATE);
    }

    if (sprintWeeks < 1 || sprintWeeks > 3) {
      throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
    }

    memberRoles = memberRoles == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(memberRoles));
    fixedEvents = fixedEvents == null ? List.of() : List.copyOf(fixedEvents);

    if (countSprints(startDate, endDate, sprintWeeks) > AiDraftLimits.MAX_SPRINTS) {
      throw new FlowSpaceException(ErrorCode.AI_PERIOD_TOO_LONG);
    }
  }

  // 기간을 스프린트 길이로 나눈 개수예요(남는 기간은 마지막 스프린트로 짧게 둬요).
  private static int countSprints(LocalDate startDate, LocalDate endDate, int sprintWeeks) {
    long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
    long length = sprintWeeks * 7L;

    return (int) ((days + length - 1) / length);
  }

  // 담당자가 될 수 있는 멤버의 id예요.
  public Set<Long> memberIds() {
    return memberRoles.keySet();
  }

  public int sprintCount() {
    return countSprints(startDate, endDate, sprintWeeks);
  }

  // index번째(0부터) 스프린트의 시작일
  public LocalDate sprintStart(int index) {
    return startDate.plusDays((long) index * sprintWeeks * 7);
  }

  // index번째 스프린트의 종료일(마지막 스프린트는 전체 종료일을 넘지 않아요)
  public LocalDate sprintEnd(int index) {
    LocalDate end = sprintStart(index).plusDays(sprintWeeks * 7L - 1);

    return end.isAfter(endDate) ? endDate : end;
  }

  // index번째 스프린트가 몇 주인지(마지막 스프린트는 더 짧을 수 있어요)
  public int weeksOf(int index) {
    long days = ChronoUnit.DAYS.between(sprintStart(index), sprintEnd(index)) + 1;

    return (int) Math.max(1, (days + 6) / 7);
  }
}

// @formatter:on
