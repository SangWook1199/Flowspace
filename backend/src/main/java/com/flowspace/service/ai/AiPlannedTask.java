package com.flowspace.service.ai;

import com.flowspace.entity.enums.TaskPriority;

// 날짜를 정하기 전의 작업이에요. 모델이 준 값을 정리한 것이고, week는 스프린트 안에서 몇 번째 주(가장 빠른 시작 주)인지,
// days는 평일로 며칠짜리인지예요. 우선순위·담당자는 뒤 단계에서 서버가 고칠 수 있어서 withXxx로 새 값을 만들어요.
record AiPlannedTask(String title, String description, TaskPriority priority, Long assignee, int week, int days) {

    AiPlannedTask withPriority(TaskPriority newPriority) {
        return new AiPlannedTask(title, description, newPriority, assignee, week, days);
    }

    AiPlannedTask withAssignee(Long newAssignee) {
        return new AiPlannedTask(title, description, priority, newAssignee, week, days);
    }
}
