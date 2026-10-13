package com.flowspace.dto.ai;

import java.util.List;

// AI가 초안을 만드는 중의 진행 모습이에요(화면이 퍼센트와 "지금 만든 작업"을 보여줄 때 써요).
// percent는 지금까지 받은 답에서 스프린트·작업이 얼마나 나왔는지로 어림한 값이라 정확한 시간은 아니에요.
// phase: WRITING(만드는 중), CHECKING(다 받아서 검사하는 중)
public record AiProgressInfo(
    int percent,
    String phase,
    int sprintIndex,
    int sprintCount,
    String sprintName,
    int taskCount,
    List<String> recentTasks
) {
}
