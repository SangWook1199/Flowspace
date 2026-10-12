package com.flowspace.dto.ai;

import java.util.List;

// @formatter:off

// 초안을 워크스페이스에 만든 결과(만들어진 개수와 스프린트 id)예요.
public record AiApplyResponse(
  int sprintCount,
  int taskCount,
  int eventCount,
  List<Long> sprintIds
) {
}

// @formatter:on
