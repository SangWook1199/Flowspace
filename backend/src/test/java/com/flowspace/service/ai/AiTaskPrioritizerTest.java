package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.entity.enums.TaskPriority;

// 우선순위 정리 규칙(HIGH는 30% 이하, 핵심 작업 먼저, 핵심은 LOW로 두지 않기)을 확인해요.
class AiTaskPrioritizerTest {

    private static AiPlannedTask task(String title, TaskPriority priority) {
        return new AiPlannedTask(title, null, priority, null, 1, 1);
    }

    @Test
    @DisplayName("핵심 작업을 알아보되 화면·문서·테스트 작업은 핵심으로 보지 않는다")
    void detectsCore() {
        assertTrue(AiTaskPrioritizer.isCore(task("JWT 인증 구현", TaskPriority.MEDIUM)));
        assertTrue(AiTaskPrioritizer.isCore(task("DB 설계", TaskPriority.MEDIUM)));
        assertFalse(AiTaskPrioritizer.isCore(task("로그인 페이지 UI", TaskPriority.MEDIUM)));
        assertFalse(AiTaskPrioritizer.isCore(task("인증 테스트", TaskPriority.MEDIUM)));
        assertFalse(AiTaskPrioritizer.isCore(task("회의 정리", TaskPriority.MEDIUM)));
    }

    @Test
    @DisplayName("HIGH는 30%까지만 남기고 핵심이면서 HIGH인 작업이 먼저다")
    void limitsHigh() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(
            task("인증 구현", TaskPriority.MEDIUM),
            task("DB 설계", TaskPriority.LOW),
            task("로그인 페이지", TaskPriority.HIGH),
            task("회원가입 API", TaskPriority.HIGH),
            task("문서 정리", TaskPriority.HIGH)));
        for (int i = 0; i < 5; i++) {
            tasks.add(task("기타 작업 " + i, TaskPriority.MEDIUM));
        }

        AiTaskPrioritizer.apply(tasks);

        // 10개의 30% = 3개: 회원가입 API(핵심+HIGH), 인증 구현, DB 설계
        assertEquals(TaskPriority.HIGH, tasks.get(0).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(1).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(2).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(3).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(4).priority());
        assertEquals(3L, tasks.stream().filter(t -> t.priority() == TaskPriority.HIGH).count());
    }

    @Test
    @DisplayName("자리를 못 받은 핵심 작업은 LOW로 두지 않고 MEDIUM으로 올린다")
    void coreIsNeverLow() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(
            task("인증 구현", TaskPriority.LOW),
            task("JWT 발급", TaskPriority.LOW),
            task("배포 설정", TaskPriority.LOW),
            task("스키마 작성", TaskPriority.LOW)));
        for (int i = 0; i < 6; i++) {
            tasks.add(task("정리 " + i, TaskPriority.LOW));
        }

        AiTaskPrioritizer.apply(tasks);

        assertEquals(TaskPriority.HIGH, tasks.get(0).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(2).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(3).priority());
        assertEquals(TaskPriority.LOW, tasks.get(4).priority());
    }

    @Test
    @DisplayName("작업이 한두 개여도 HIGH 한 자리는 있다")
    void atLeastOneSlot() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("인증 구현", TaskPriority.MEDIUM)));

        AiTaskPrioritizer.apply(tasks);

        assertEquals(TaskPriority.HIGH, tasks.get(0).priority());
    }
}
