package com.flowspace.dto.ai;

import java.util.List;

// @formatter:off

// 모델이 만들어 준 날것의 초안이에요(이벤트는 모델이 만들지 않고 서버가 만들어요). 믿지 않고, 서버가 검증·보정한 뒤에 AiDraft로 바꿔요.
// 틀린 값이 와도 읽을 수 있게 숫자는 Integer, 열거값은 문자열로 받아요.
public record AiRawDraft(
  List<Sprint> sprints
) {

  public record Sprint(
    String name,
    String goal,
    List<Task> tasks
  ) {
  }

  public record Task(
    String title,
    String description,
    String priority,
    Long assigneeUserId,
    Integer weekInSprint,
    Integer durationDays
  ) {
  }

}

// @formatter:on
