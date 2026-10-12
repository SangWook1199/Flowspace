package com.flowspace.dto.ai;

// AI 초안 한도예요. 모델이 많이 만들어도, 사용자가 많이 보내도 이 안에서만 받아요.
public final class AiDraftLimits {

    public static final int MAX_SPRINTS = 12;
    public static final int MAX_TASKS_PER_SPRINT = 15;
    public static final int MAX_EVENTS = 20;

    public static final int MAX_SPRINT_NAME = 100;
    public static final int MAX_GOAL = 500;
    public static final int MAX_TITLE = 200;
    public static final int MAX_DESCRIPTION = 2000;

    // 작업 하나의 기간은 평일 기준 최대 5일이에요.
    public static final int MAX_TASK_DAYS = 5;

    private AiDraftLimits() {
    }
}
