package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.entity.enums.TaskPriority;

// 날짜 계산 규칙(담당자별 이어 붙이기, 작업 순서 규칙, 스프린트 끝 처리)을 확인해요.
class AiSchedulerTest {

    // 2026-10-12(월) ~ 10-25(일), 2주 스프린트. 둘째 주 월요일은 10-19, 마지막 평일은 10-23(금).
    private static final LocalDate START = LocalDate.of(2026, 10, 12);
    private static final LocalDate END = LocalDate.of(2026, 10, 25);

    private static AiPlannedTask task(String title, Long assignee, int week, int days) {
        return new AiPlannedTask(title, null, TaskPriority.MEDIUM, assignee, week, days);
    }

    private static List<AiDraft.Task> run(AiPlannedTask... tasks) {
        return AiScheduler.schedule(List.of(tasks), START, END);
    }

    private static LocalDate d(int day) {
        return LocalDate.of(2026, 10, day);
    }

    @Test
    @DisplayName("담당자도 순서 규칙도 없으면 말한 주의 첫 평일부터 시작한다")
    void startsAtWeek() {
        List<AiDraft.Task> result = run(task("A", null, 1, 3), task("B", null, 2, 2));

        assertEquals(d(12), result.get(0).startDate());
        assertEquals(d(14), result.get(0).endDate());
        assertEquals(d(19), result.get(1).startDate());
        assertEquals(d(20), result.get(1).endDate());
    }

    @Test
    @DisplayName("같은 담당자의 작업은 앞 작업이 끝난 다음 평일부터 이어 붙인다")
    void stacksSameAssignee() {
        List<AiDraft.Task> result = run(task("A", 1L, 1, 3), task("B", 1L, 1, 2), task("C", 2L, 1, 2));

        assertEquals(d(15), result.get(1).startDate());
        assertEquals(d(16), result.get(1).endDate());
        assertEquals(d(12), result.get(2).startDate());
    }

    @Test
    @DisplayName("서버 배포 환경 구축이 끝난 다음에 최종 배포를 시작한다")
    void deployAfterEnvironment() {
        List<AiDraft.Task> result = run(
            task("서버 배포 환경 구축", 1L, 2, 3),
            task("최종 배포 및 문서화", 2L, 2, 2));

        assertEquals(d(19), result.get(0).startDate());
        assertEquals(d(21), result.get(0).endDate());
        assertEquals(d(22), result.get(1).startDate());
        assertEquals(d(23), result.get(1).endDate());
    }

    @Test
    @DisplayName("최종 배포가 앞에 적혀 있어도 환경 구축과 통합 테스트가 끝난 뒤로 미룬다")
    void deployAfterTestsEvenIfListedFirst() {
        List<AiDraft.Task> result = run(
            task("최종 배포", 2L, 1, 1),
            task("통합 테스트", 1L, 2, 2),
            task("배포 환경 구성", 3L, 1, 2));

        assertEquals(d(21), result.get(0).startDate());
        assertEquals(d(21), result.get(0).endDate());
        assertEquals(d(19), result.get(1).startDate());
        assertEquals(d(20), result.get(1).endDate());
    }

    @Test
    @DisplayName("남은 평일이 모자라지만 절반 이상이면 스프린트 끝에 맞춰 기간을 줄인다")
    void shortensAtSprintEnd() {
        List<AiDraft.Task> result = run(task("A", 1L, 2, 4), task("B", 1L, 2, 2));

        assertEquals(d(23), result.get(1).startDate());
        assertEquals(d(23), result.get(1).endDate());
    }

    @Test
    @DisplayName("남은 평일이 너무 적으면 겹치더라도 원래 자리에 둔다")
    void keepsHomeWhenTooLittleRoom() {
        List<AiDraft.Task> result = run(task("A", 1L, 2, 4), task("B", 1L, 2, 4));

        assertEquals(d(19), result.get(1).startDate());
        assertEquals(d(22), result.get(1).endDate());
    }

    @Test
    @DisplayName("끝날짜는 스프린트 끝날을 넘지 않고 결과는 입력 순서를 지킨다")
    void capsAtSprintEnd() {
        List<AiDraft.Task> result = run(task("A", null, 2, 5), task("B", null, 2, 5));

        for (AiDraft.Task task : result) {
            assertTrue(!task.endDate().isAfter(END));
        }

        assertEquals("A", result.get(0).title());
        assertEquals("B", result.get(1).title());
    }

    // ---------- 같은 담당자의 작업 사이 틈 ----------

    @Test
    @DisplayName("같은 담당자의 다음 작업까지 평일이 비면 앞 작업을 최대 2일 늘린다")
    void fillsGapUpToTwoDays() {
        // A: 10/12~13, 다음 작업은 둘째 주 월요일(10/19). 사이의 평일은 14·15·16일(3일).
        List<AiDraft.Task> result = run(task("A", 1L, 1, 2), task("B", 1L, 2, 2));

        assertEquals(d(15), result.get(0).endDate());
        assertEquals(d(19), result.get(1).startDate());
    }

    @Test
    @DisplayName("한 작업은 5일을 넘지 않게 늘린다")
    void fillKeepsFiveDayLimit() {
        List<AiDraft.Task> four = run(task("A", 1L, 1, 4), task("B", 1L, 2, 2));
        List<AiDraft.Task> five = run(task("A", 1L, 1, 5), task("B", 1L, 2, 2));

        assertEquals(d(16), four.get(0).endDate());
        assertEquals(d(16), five.get(0).endDate());
    }

    @Test
    @DisplayName("이 작업이 끝나야 시작하는 작업이 있으면 그 시작일 전까지만 늘린다")
    void fillStopsBeforeSuccessor() {
        List<AiDraft.Task> result = run(
            task("서버 배포 환경 구축", 1L, 1, 2),
            task("다음 작업", 1L, 2, 2),
            task("최종 배포", 2L, 1, 1));

        // 배포 환경은 10/12~13, 최종 배포는 10/14에 시작하니까 늘릴 자리가 없다.
        assertEquals(d(13), result.get(0).endDate());
        assertEquals(d(14), result.get(2).startDate());
    }

    @Test
    @DisplayName("담당자가 없는 작업과 맨 마지막 작업은 늘리지 않는다")
    void fillSkipsUnassignedAndLast() {
        List<AiDraft.Task> result = run(task("A", null, 1, 2), task("B", null, 2, 2), task("C", 1L, 1, 2));

        assertEquals(d(13), result.get(0).endDate());
        assertEquals(d(13), result.get(2).endDate());
    }
}
