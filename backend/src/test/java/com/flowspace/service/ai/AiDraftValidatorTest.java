package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiRawDraft;
import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 모델이 만든 초안을 서버가 고치고 날짜를 계산하는 규칙(개수, 주차, 담당자 이어 붙이기, 우선순위, 이름, 조사 교정, 서버가 만드는 이벤트, 글자 정리)을 확인해요.
class AiDraftValidatorTest {

    private final AiDraftValidator validator = new AiDraftValidator();

    // 2026-10-12(월)부터 8주, 2주 스프린트 → 스프린트 4개
    private static final LocalDate START = LocalDate.of(2026, 10, 12);
    private static final LocalDate END = LocalDate.of(2026, 12, 6);

    private AiDraftContext context() {
        return new AiDraftContext(START, END, 2, Set.of(1L, 2L, 3L), List.of());
    }

    private static AiRawDraft.Task task(String title, int week, int days) {
        return new AiRawDraft.Task(title, "설명", "HIGH", 1L, week, days);
    }

    private static AiRawDraft.Sprint sprint(String name, AiRawDraft.Task... tasks) {
        return new AiRawDraft.Sprint(name, "목표", List.of(tasks));
    }

    private static AiRawDraft raw(int sprintCount) {
        List<AiRawDraft.Sprint> sprints = new ArrayList<>();

        for (int i = 1; i <= sprintCount; i++) {
            sprints.add(sprint("스프린트 " + i + ": 이름" + i, task("작업 하기", 1, 2)));
        }

        return new AiRawDraft(sprints);
    }

    // ---------- 한자·일본어 섞임 ----------

    @Test
    @DisplayName("작업 설명에 한자가 섞이면 다시 만들게 하고, 섞인 글자를 알려준다")
    void rejectsForeignScript() {
        AiRawDraft draft = new AiRawDraft(
            List.of(sprint("기반", new AiRawDraft.Task("작업", "테스트中发现된 오류를 고친다.", "HIGH", 1L, 1, 2)),
                sprint("기능", task("작업 하기", 1, 2)), sprint("연동", task("작업 하기", 1, 2)),
                sprint("마무리", task("작업 하기", 1, 2))));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(draft, context()));

        assertTrue(e.getMessage().contains("中发现"));
    }

    @Test
    @DisplayName("스프린트 이름의 일본어도 막고, 한글과 영어 기술 용어는 통과한다")
    void foreignScriptInNameAndOkText() {
        AiRawDraft bad = new AiRawDraft(List.of(sprint("レビュー", task("작업 하기", 1, 2)), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        assertThrows(AiDraftException.class, () -> validator.toDraft(bad, context()));

        AiRawDraft ok = new AiRawDraft(
            List.of(sprint("API 설계", new AiRawDraft.Task("JWT 로그인 구현", "Spring Boot로 만든다.", "HIGH", 1L, 1, 2)),
                sprint("기능", task("작업 하기", 1, 2)), sprint("연동", task("작업 하기", 1, 2)),
                sprint("마무리", task("작업 하기", 1, 2))));

        assertDoesNotThrow(() -> validator.toDraft(ok, context()));
    }

    @Test
    @DisplayName("사용자가 직접 쓴 고정 일정에 한자가 있어도 그대로 쓴다")
    void fixedEventMayContainHanja() {
        AiDraftContext context = new AiDraftContext(START, END, 2, Set.of(1L),
            List.of(new AiDraftContext.FixedEvent("中間 발표", LocalDate.of(2026, 11, 20))));

        AiDraft draft = validator.toDraft(raw(4), context);

        assertTrue(draft.events().stream().anyMatch(e -> e.title().equals("中間 발표")));
    }

    // ---------- 기간 → 스프린트 ----------

    @Test
    @DisplayName("8주 기간을 2주 스프린트로 나누면 4개이고, 날짜가 이어진다")
    void sprintCountAndDates() {
        AiDraftContext context = context();

        assertEquals(4, context.sprintCount());
        assertEquals(LocalDate.of(2026, 10, 12), context.sprintStart(0));
        assertEquals(LocalDate.of(2026, 10, 25), context.sprintEnd(0));
        assertEquals(LocalDate.of(2026, 10, 26), context.sprintStart(1));
        assertEquals(LocalDate.of(2026, 12, 6), context.sprintEnd(3));
    }

    @Test
    @DisplayName("남는 기간은 마지막 스프린트로 짧게 두고, 종료일을 넘지 않는다")
    void lastSprintIsShorter() {
        // 9주(63일) → 2주씩 4개 + 1주짜리 1개
        AiDraftContext context = new AiDraftContext(START, START.plusDays(62), 2, Set.of(), List.of());

        assertEquals(5, context.sprintCount());
        assertEquals(START.plusDays(62), context.sprintEnd(4));
        assertEquals(1, context.weeksOf(4));
        assertEquals(2, context.weeksOf(0));
    }

    @Test
    @DisplayName("스프린트가 12개를 넘는 긴 기간은 거절한다")
    void periodTooLong() {
        // 1주 스프린트로 26주 → 26개
        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> new AiDraftContext(START, START.plusWeeks(26), 1, Set.of(), List.of()));

        assertEquals(ErrorCode.AI_PERIOD_TOO_LONG, e.getErrorCode());
    }

    // ---------- 개수 ----------

    @Test
    @DisplayName("모델이 스프린트를 모자라게 만들면 다시 만들게 한다")
    void tooFewSprints() {
        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw(3), context()));

        assertEquals("스프린트가 3개뿐이에요. 정확히 4개를 만들어 주세요.", e.getMessage());
    }

    @Test
    @DisplayName("모델이 스프린트를 더 많이 만들면 앞의 4개만 쓴다")
    void tooManySprints() {
        AiDraft draft = validator.toDraft(raw(6), context());

        assertEquals(4, draft.sprints().size());
    }

    @Test
    @DisplayName("스프린트에 작업이 하나도 없으면 다시 만들게 한다")
    void sprintWithoutTasks() {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", task("작업", 1, 1)), sprint("b"), sprint("c", task("작업", 1, 1)),
            sprint("d", task("작업", 1, 1))));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw, context()));

        assertEquals("2번째 스프린트에 작업이 없어요. 스프린트마다 작업을 만들어 주세요.", e.getMessage());
    }

    @Test
    @DisplayName("스프린트마다 작업은 15개까지만 둔다")
    void taskLimit() {
        List<AiRawDraft.Task> tasks = new ArrayList<>();

        for (int i = 0; i < 20; i++) {
            tasks.add(task("작업 " + i, 1, 1));
        }

        AiRawDraft raw = new AiRawDraft(
            List.of(new AiRawDraft.Sprint("a", "g", tasks), sprint("b", task("t", 1, 1)), sprint("c", task("t", 1, 1)),
                sprint("d", task("t", 1, 1))));

        assertEquals(15, validator.toDraft(raw, context(), false).sprints().get(0).tasks().size());
    }

    // ---------- 날짜 ----------

    @Test
    @DisplayName("주차와 기간으로 작업 날짜를 계산한다")
    void taskDates() {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", task("첫째 주 3일", 1, 3), task("둘째 주 5일", 2, 5)),
            sprint("b", task("t", 1, 1)), sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, context()).sprints().get(0).tasks();

        // 첫째 주: 10/12(월) 시작, 평일 3일 → 10/14(수). 같은 담당자의 다음 작업(10/19)까지 비는 이틀은 여유로 늘려서 10/16(금)
        assertEquals(LocalDate.of(2026, 10, 12), tasks.get(0).startDate());
        assertEquals(LocalDate.of(2026, 10, 16), tasks.get(0).endDate());
        // 둘째 주: 10/19(월) 시작, 평일 5일 → 10/23(금)
        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(1).startDate());
        assertEquals(LocalDate.of(2026, 10, 23), tasks.get(1).endDate());
    }

    @Test
    @DisplayName("기간은 주말을 건너뛰고, 5일을 넘으면 5일로 줄인다")
    void skipsWeekendAndCapsDuration() {
        // 수요일에 시작해서 5일이면 다음 주 화요일까지(토·일 제외)
        LocalDate wednesday = LocalDate.of(2026, 10, 14);
        AiDraftContext context = new AiDraftContext(wednesday, wednesday.plusDays(13), 2, Set.of(1L), List.of());

        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", task("긴 작업", 1, 9))));
        AiDraft.Task task = validator.toDraft(raw, context).sprints().get(0).tasks().get(0);

        assertEquals(wednesday, task.startDate());
        assertEquals(LocalDate.of(2026, 10, 20), task.endDate());
    }

    @Test
    @DisplayName("주차가 스프린트 길이를 넘으면 마지막 주로 보정한다(작은 모델이 전체 주차를 쓰는 경우)")
    void weekBeyondSprintIsClamped() {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", task("t", 4, 2)), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        AiDraft.Task task = validator.toDraft(raw, context()).sprints().get(0).tasks().get(0);

        // 2주 스프린트라 2주차(10/19)로 보정
        assertEquals(LocalDate.of(2026, 10, 19), task.startDate());
        assertEquals(LocalDate.of(2026, 10, 20), task.endDate());
    }

    // ---------- 값 보정 ----------

    @Test
    @DisplayName("스프린트 이름 앞의 번호 접두사를 지운다(한국어·영어)")
    void stripsSprintPrefix() {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("스프린트 1: 기획 및 설계", task("t", 1, 1)),
            sprint("Sprint 2 - 핵심 기능", task("t", 1, 1)), sprint("스프린트 3", task("t", 1, 1)),
            sprint("스프린트 회고 준비", task("t", 1, 1))));

        List<AiDraft.Sprint> sprints = validator.toDraft(raw, context()).sprints();

        assertEquals("기획 및 설계", sprints.get(0).name());
        assertEquals("핵심 기능", sprints.get(1).name());
        // 번호만 있으면 지우지 않고 기본 이름을 쓴다
        assertEquals("스프린트 3", sprints.get(2).name());
        // 번호가 없는 이름은 그대로
        assertEquals("스프린트 회고 준비", sprints.get(3).name());
    }

    @Test
    @DisplayName("담당자가 멤버가 아니면 비워 둔다")
    void unknownAssigneeIsCleared() {
        AiRawDraft.Task member = new AiRawDraft.Task("멤버 작업", "d", "HIGH", 2L, 1, 1);
        AiRawDraft.Task outsider = new AiRawDraft.Task("없는 사람 작업", "d", "HIGH", 99L, 1, 1);
        AiRawDraft.Task none = new AiRawDraft.Task("담당 없음", "d", "HIGH", null, 1, 1);

        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", member, outsider, none), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, context()).sprints().get(0).tasks();

        assertEquals(2L, tasks.get(0).assigneeUserId());
        assertNull(tasks.get(1).assigneeUserId());
        assertNull(tasks.get(2).assigneeUserId());
    }

    @Test
    @DisplayName("우선순위는 대소문자를 가리지 않고, 모르는 값은 MEDIUM으로 둔다")
    void priorityIsNormalized() {
        AiRawDraft.Task low = new AiRawDraft.Task("a", "d", "low", 1L, 1, 1);
        AiRawDraft.Task unknown = new AiRawDraft.Task("b", "d", "URGENT", 1L, 1, 1);
        AiRawDraft.Task missing = new AiRawDraft.Task("c", "d", null, 1L, 1, 1);

        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", low, unknown, missing), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, context()).sprints().get(0).tasks();

        assertEquals(TaskPriority.LOW, tasks.get(0).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(1).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(2).priority());
    }

    @Test
    @DisplayName("제목이 비어 있는 작업은 버린다")
    void blankTitleIsDropped() {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", task("   ", 1, 1), task("남는 작업", 1, 1)),
            sprint("b", task("t", 1, 1)), sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, context()).sprints().get(0).tasks();

        assertEquals(1, tasks.size());
        assertEquals("남는 작업", tasks.get(0).title());
    }

    // ---------- 이벤트(서버가 만들어요) ----------

    @Test
    @DisplayName("스프린트마다 마지막 평일에 리뷰 이벤트를 만든다(스프린트가 일요일에 끝나면 금요일)")
    void sprintReviewEvents() {
        List<AiDraft.Event> events = validator.toDraft(raw(4), context()).events();

        assertEquals(4, events.size());
        assertEquals("스프린트 1 리뷰", events.get(0).title());
        assertEquals(LocalDate.of(2026, 10, 23), events.get(0).date());
        assertEquals(LocalDate.of(2026, 11, 6), events.get(1).date());
        assertEquals(LocalDate.of(2026, 11, 20), events.get(2).date());
        assertEquals("스프린트 4 리뷰", events.get(3).title());
        assertEquals(LocalDate.of(2026, 12, 4), events.get(3).date());
    }

    @Test
    @DisplayName("고정 일정은 그대로 이벤트가 되고, 기간 밖이나 중복은 빠지며 날짜순으로 정렬된다")
    void fixedEvents() {
        AiDraftContext context = new AiDraftContext(START, END, 2, Set.of(1L),
            List.of(new AiDraftContext.FixedEvent("중간 발표", LocalDate.of(2026, 11, 9)),
                new AiDraftContext.FixedEvent("기간 밖", LocalDate.of(2027, 1, 1)),
                new AiDraftContext.FixedEvent("중간 발표", LocalDate.of(2026, 11, 9))));

        List<AiDraft.Event> events = validator.toDraft(raw(4), context).events();

        assertEquals(5, events.size());
        assertEquals("스프린트 1 리뷰", events.get(0).title());
        assertEquals("스프린트 2 리뷰", events.get(1).title());
        assertEquals("중간 발표", events.get(2).title());
        assertEquals(LocalDate.of(2026, 11, 9), events.get(2).date());
        assertEquals("스프린트 3 리뷰", events.get(3).title());
    }

    @Test
    @DisplayName("이벤트는 20개를 넘지 않고, 고정 일정이 리뷰보다 먼저 자리를 차지한다")
    void eventCapPrefersFixedEvents() {
        List<AiDraftContext.FixedEvent> fixed = new ArrayList<>();

        for (int i = 0; i < 20; i++) {
            fixed.add(new AiDraftContext.FixedEvent("일정 " + i, START.plusDays(i)));
        }

        AiDraftContext context = new AiDraftContext(START, END, 2, Set.of(1L), fixed);

        List<AiDraft.Event> events = validator.toDraft(raw(4), context).events();

        assertEquals(20, events.size());
        assertTrue(events.stream().noneMatch(e -> e.title().contains("리뷰")));
    }

    @Test
    @DisplayName("모델이 events를 보내도 쓰지 않는다")
    void modelEventsAreIgnored() throws Exception {
        AiRawDraft parsed = AiDraftGenerator.parse("{\"sprints\":[],\"events\":[{\"title\":\"지어낸 발표\"}]}");

        assertEquals(0, parsed.sprints().size());
    }

    // ---------- 같은 담당자 작업 이어 붙이기 ----------

    private static AiRawDraft.Task assigned(String title, Long assignee, int week, int days) {
        return new AiRawDraft.Task(title, "설명", "HIGH", assignee, week, days);
    }

    private List<AiDraft.Task> firstSprintTasks(AiRawDraft.Task... tasks) {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", tasks), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        return validator.toDraft(raw, context()).sprints().get(0).tasks();
    }

    @Test
    @DisplayName("같은 담당자의 같은 주 작업은 앞 작업이 끝난 다음 평일부터 이어 붙인다")
    void sameAssigneeTasksAreStacked() {
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("A", 1L, 1, 2), assigned("B", 1L, 1, 3),
            assigned("C", 1L, 1, 2));

        // A 10/12~13, B 10/14~16, C는 주말을 건너뛰고 10/19~20
        assertEquals(LocalDate.of(2026, 10, 12), tasks.get(0).startDate());
        assertEquals(LocalDate.of(2026, 10, 13), tasks.get(0).endDate());
        assertEquals(LocalDate.of(2026, 10, 14), tasks.get(1).startDate());
        assertEquals(LocalDate.of(2026, 10, 16), tasks.get(1).endDate());
        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(2).startDate());
        assertEquals(LocalDate.of(2026, 10, 20), tasks.get(2).endDate());
    }

    @Test
    @DisplayName("담당자가 다르거나 없으면 서로 이어 붙이지 않고 각자 주차의 첫 평일에 시작한다")
    void differentOrNoAssigneeAreNotStacked() {
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("A", 1L, 1, 3), assigned("B", 2L, 1, 3),
            assigned("C", null, 1, 3), assigned("D", null, 1, 3));

        for (AiDraft.Task task : tasks) {
            assertEquals(LocalDate.of(2026, 10, 12), task.startDate());
        }
    }

    @Test
    @DisplayName("이어 붙이면 스프린트를 넘어가는 작업은 겹치더라도 원래 자리에 둔다")
    void overflowFallsBackToOriginalPlace() {
        // 1주짜리 스프린트(10/12~10/18): 5일 작업 뒤에 3일 작업을 이어 붙이면 넘어간다
        AiDraftContext oneWeek = new AiDraftContext(START, START.plusDays(6), 1, Set.of(1L), List.of());

        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", assigned("긴 작업", 1L, 1, 5), assigned("뒤 작업", 1L, 1, 3))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, oneWeek).sprints().get(0).tasks();

        assertEquals(LocalDate.of(2026, 10, 16), tasks.get(0).endDate());
        assertEquals(LocalDate.of(2026, 10, 12), tasks.get(1).startDate());
        assertEquals(LocalDate.of(2026, 10, 14), tasks.get(1).endDate());
    }

    @Test
    @DisplayName("작업은 주차 순으로 놓이고, 같은 주 안에서는 모델이 쓴 순서를 지킨다")
    void tasksAreOrderedByWeek() {
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("둘째 주", 2L, 2, 1), assigned("첫째 주 가", 1L, 1, 1),
            assigned("첫째 주 나", 2L, 1, 1));

        assertEquals("첫째 주 가", tasks.get(0).title());
        assertEquals("첫째 주 나", tasks.get(1).title());
        assertEquals("둘째 주", tasks.get(2).title());
        // 둘째 주 작업은 담당자(2)의 첫째 주 작업(10/12) 뒤가 아니라 둘째 주(10/19)에 시작한다
        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(2).startDate());
    }

    @Test
    @DisplayName("한 사람의 작업이 많아도 스프린트 끝(마지막 평일)을 넘지 않는다")
    void stackedTasksStayInsideSprint() {
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("1", 1L, 1, 5), assigned("2", 1L, 1, 5),
            assigned("3", 1L, 1, 5), assigned("4", 1L, 2, 3));

        for (AiDraft.Task task : tasks) {
            assertTrue(!task.endDate().isAfter(LocalDate.of(2026, 10, 25)));
        }

        // 1·2번은 이어 붙고(10/12~16, 10/19~23), 3번은 더 이어 붙으면 넘어가서 원래 자리(10/12)에 둔다
        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(1).startDate());
        assertEquals(LocalDate.of(2026, 10, 12), tasks.get(2).startDate());
    }

    @Test
    @DisplayName("이어 붙이면 넘어가도 남은 평일이 절반 이상이면 스프린트 끝에 맞춰 기간을 줄여 끼운다")
    void overflowIsShortenedToFit() {
        // 스프린트 1: 10/12~25, 마지막 평일 10/23. B는 10/19~21(3일) 뒤에 C(3일)를 이으면 10/26까지 가서 넘는다.
        // 남은 평일(10/22~23)이 2일로 3일의 절반 이상이라 C를 10/22~23으로 줄여 끼운다.
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("A", 1L, 1, 5), assigned("B", 1L, 2, 3),
            assigned("C", 1L, 2, 3));

        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(1).startDate());
        assertEquals(LocalDate.of(2026, 10, 21), tasks.get(1).endDate());
        assertEquals(LocalDate.of(2026, 10, 22), tasks.get(2).startDate());
        assertEquals(LocalDate.of(2026, 10, 23), tasks.get(2).endDate());
    }

    @Test
    @DisplayName("남은 평일이 절반보다 적으면 줄이지 않고 원래 자리에 겹쳐 둔다")
    void tooLittleRoomOverlaps() {
        // B는 10/19~22(4일). C(5일)는 10/23 하루만 남아 절반(3일)보다 적으므로 원래 자리(둘째 주 첫 평일 10/19)에 둔다.
        List<AiDraft.Task> tasks = firstSprintTasks(assigned("A", 1L, 1, 5), assigned("B", 1L, 2, 4),
            assigned("C", 1L, 2, 5));

        assertEquals(LocalDate.of(2026, 10, 19), tasks.get(2).startDate());
        assertEquals(LocalDate.of(2026, 10, 23), tasks.get(2).endDate());
    }

    // ---------- HIGH 상한 ----------

    private static AiRawDraft.Task prio(String title, String priority, int week) {
        return new AiRawDraft.Task(title, "설명", priority, null, week, 1);
    }

    private List<AiDraft.Task> firstSprintTasksOf(AiRawDraft.Task... tasks) {
        AiRawDraft raw = new AiRawDraft(List.of(sprint("a", tasks), sprint("b", task("t", 1, 1)),
            sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        // 우선순위 규칙만 보는 시험이라, 담당자가 없는 작업을 "놀고 있는 멤버"로 걸러내지 않게 strict=false로 불러요.
        return validator.toDraft(raw, context(), false).sprints().get(0).tasks();
    }

    @Test
    @DisplayName("HIGH는 스프린트 작업의 30%까지만 두고, 넘치면 뒤에 있는 것부터 MEDIUM으로 낮춘다")
    void highIsCapped() {
        // 작업 10개 → HIGH는 3개까지
        List<AiRawDraft.Task> raw = new ArrayList<>();

        for (int i = 1; i <= 10; i++) {
            raw.add(prio("작업 " + i, i <= 6 ? "HIGH" : "LOW", 1));
        }

        List<AiDraft.Task> tasks = firstSprintTasksOf(raw.toArray(new AiRawDraft.Task[0]));

        assertEquals(TaskPriority.HIGH, tasks.get(0).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(1).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(2).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(3).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(5).priority());
        assertEquals(TaskPriority.LOW, tasks.get(6).priority());
    }

    @Test
    @DisplayName("작업이 적어도 HIGH는 1개까지 둘 수 있다")
    void highAllowsOneForSmallSprints() {
        List<AiDraft.Task> tasks = firstSprintTasksOf(prio("가", "HIGH", 1), prio("나", "HIGH", 1));

        assertEquals(TaskPriority.HIGH, tasks.get(0).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(1).priority());
    }

    @Test
    @DisplayName("인증·로그인 API 같은 핵심 작업은 모델이 MEDIUM·LOW로 적어도 HIGH로 올리고, 화면 작업은 올리지 않는다")
    void corePrioritiesAreRaised() {
        // 작업 10개 → HIGH는 3개까지. 핵심(JWT 로그인 API, 인증 미들웨어, 서버 배포 설정)이 HIGH를 받아요.
        List<AiDraft.Task> tasks = firstSprintTasksOf(prio("환경 설정", "HIGH", 1), prio("로그인 페이지 UI 개발", "HIGH", 1),
            prio("JWT 기반 로그인 API 개발", "LOW", 1), prio("인증 미들웨어 구현", "MEDIUM", 1), prio("서버 배포 설정", "MEDIUM", 2),
            prio("상품 목록 UI", "MEDIUM", 2), prio("작업 7", "LOW", 2), prio("작업 8", "LOW", 2), prio("작업 9", "LOW", 2),
            prio("작업 10", "LOW", 2));

        assertEquals(TaskPriority.MEDIUM, tasks.get(0).priority()); // 핵심이 아닌 HIGH는 자리를 내줘요
        assertEquals(TaskPriority.MEDIUM, tasks.get(1).priority()); // 로그인 "페이지 UI"는 핵심이 아니에요
        assertEquals(TaskPriority.HIGH, tasks.get(2).priority()); // LOW로 적었어도 올려요
        assertEquals(TaskPriority.HIGH, tasks.get(3).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(4).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(5).priority());
        assertEquals(TaskPriority.LOW, tasks.get(6).priority());
    }

    @Test
    @DisplayName("핵심 작업이 자리를 못 받아도 LOW로는 두지 않고, 핵심이면서 HIGH인 작업이 먼저 자리를 받는다")
    void coreFloorAndRank() {
        // 작업 5개 → HIGH는 1개. 핵심 3개 중 모델이 HIGH로 적은 "DB 스키마 설계"가 자리를 받아요.
        List<AiDraft.Task> tasks = firstSprintTasksOf(prio("JWT 로그인 API", "LOW", 1), prio("DB 스키마 설계", "HIGH", 1),
            prio("인증 미들웨어", "MEDIUM", 1), prio("문서 정리", "LOW", 2), prio("인증 문서 작성", "LOW", 2));

        assertEquals(TaskPriority.MEDIUM, tasks.get(0).priority());
        assertEquals(TaskPriority.HIGH, tasks.get(1).priority());
        assertEquals(TaskPriority.MEDIUM, tasks.get(2).priority());
        assertEquals(TaskPriority.LOW, tasks.get(3).priority());
        assertEquals(TaskPriority.LOW, tasks.get(4).priority()); // "문서"가 들어간 작업은 핵심이 아니에요
    }

    // ---------- 놀고 있는 멤버 ----------

    // 멤버 2명, 2주 스프린트 4개(작업이 4개 이상이면 "나눌 만하다"고 봐요)
    private AiDraftContext twoMembers() {
        return new AiDraftContext(START, END, 2, Set.of(1L, 2L), List.of());
    }

    private static AiRawDraft.Task by(long assignee, String title, int week, int days) {
        return new AiRawDraft.Task(title, "설명", "MEDIUM", assignee, week, days);
    }

    private AiRawDraft rawFirstSprint(AiRawDraft.Task... tasks) {
        return new AiRawDraft(List.of(sprint("a", tasks), sprint("b", task("t", 1, 1)), sprint("c", task("t", 1, 1)),
            sprint("d", task("t", 1, 1))));
    }

    @Test
    @DisplayName("작업이 충분한데 한 멤버가 아무 일도 못 받으면 다시 만들게 한다")
    void idleMemberIsRejected() {
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 3), by(1, "나", 1, 3), by(1, "다", 2, 3), by(1, "라", 2, 3));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw, twoMembers()));

        assertTrue(e.getMessage().contains("id 2 멤버"));
        assertTrue(e.getMessage().contains("스프린트 1"));
        assertTrue(e.getMessage().contains("0일만"));
    }

    @Test
    @DisplayName("평일의 40% 미만만 일하는 멤버도 다시 만들게 한다")
    void tooLittleWorkIsRejected() {
        // 멤버 2: 첫 주 1일 + 둘째 주 2일 = 평일 10일 중 3일
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 5), by(1, "나", 2, 5), by(2, "다", 1, 1), by(2, "라", 2, 2));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw, twoMembers()));

        assertTrue(e.getMessage().contains("평일 10일 중 3일만"));
    }

    @Test
    @DisplayName("한 주를 통째로 쉬는 멤버도 다시 만들게 한다")
    void idleWeekIsRejected() {
        // 멤버 2는 둘째 주에만 일해요(5일 = 50%라서 양은 괜찮지만 첫째 주가 비어요)
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 5), by(1, "나", 2, 5), by(2, "다", 2, 3), by(2, "라", 2, 2));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw, twoMembers()));

        assertTrue(e.getMessage().contains("id 2 멤버"));
        assertTrue(e.getMessage().contains("1번째 주에는 맡은 작업이 없어요"));
    }

    @Test
    @DisplayName("모두 주마다 일이 있으면 통과한다")
    void balancedPasses() {
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 3), by(1, "나", 2, 3), by(2, "다", 1, 3), by(2, "라", 2, 3));

        assertDoesNotThrow(() -> validator.toDraft(raw, twoMembers()));
    }

    @Test
    @DisplayName("작업이 멤버 수 × 주 수보다 적으면(나눌 수 없으면) 보지 않는다")
    void tooFewTasksToSplitIsSkipped() {
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 3), by(1, "나", 2, 3), by(1, "다", 2, 3));

        assertDoesNotThrow(() -> validator.toDraft(raw, twoMembers()));
    }

    @Test
    @DisplayName("멤버가 한 명이면 보지 않고, 마지막 시도(strict=false)에서는 통과시킨다")
    void idleCheckExceptions() {
        AiDraftContext one = new AiDraftContext(START, END, 2, Set.of(1L), List.of());
        AiRawDraft raw = rawFirstSprint(by(1, "가", 1, 1), by(1, "나", 2, 1));

        assertDoesNotThrow(() -> validator.toDraft(raw, one));

        AiRawDraft idle = rawFirstSprint(by(1, "가", 1, 3), by(1, "나", 1, 3), by(1, "다", 2, 3), by(1, "라", 2, 3));

        assertDoesNotThrow(() -> validator.toDraft(idle, twoMembers(), false));
    }

    // ---------- 정해진 일정과 준비 작업 ----------

    private AiDraftContext withFixed(String title, LocalDate date) {
        return new AiDraftContext(START, END, 2, Set.of(1L, 2L, 3L), List.of(new AiDraftContext.FixedEvent(title, date)));
    }

    private AiRawDraft rawWithSprint3Task(String title) {
        return new AiRawDraft(List.of(sprint("a", task("준비 작업", 1, 1)), sprint("b", task("작업", 1, 1)),
            sprint("c", task(title, 1, 2)), sprint("d", task("작업", 1, 1))));
    }

    @Test
    @DisplayName("정해진 일정 이름이 들어간 작업이 그 날짜보다 늦으면 다시 만들게 한다")
    void latePreparationIsRejected() {
        // 중간 발표 10/30, 스프린트 3은 11/9부터 → 늦다
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 10, 30));

        AiDraftException e = assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithSprint3Task("중간 발표 자료 준비"), context));

        assertTrue(e.getMessage().contains("중간 발표"));
        assertTrue(e.getMessage().contains("2026-10-30"));
    }

    @Test
    @DisplayName("띄어쓰기가 달라도 일정 이름으로 알아본다")
    void latePreparationIgnoresSpaces() {
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 10, 30));

        assertThrows(AiDraftException.class, () -> validator.toDraft(rawWithSprint3Task("중간발표 리허설"), context));
    }

    @Test
    @DisplayName("날짜 전에 끝나는 준비 작업은 통과한다")
    void earlyPreparationPasses() {
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 11, 20));

        assertDoesNotThrow(() -> validator.toDraft(rawWithSprint3Task("중간 발표 자료 준비"), context));
    }

    @Test
    @DisplayName("일정 뒤에 하는 작업(회고, 피드백)은 준비 작업으로 보지 않는다")
    void afterWorkIsNotPreparation() {
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 10, 30));

        assertDoesNotThrow(() -> validator.toDraft(rawWithSprint3Task("중간 발표 피드백 반영"), context));
        assertDoesNotThrow(() -> validator.toDraft(rawWithSprint3Task("중간 발표 후 수정"), context));
    }

    @Test
    @DisplayName("마지막 시도(strict=false)에서는 늦은 준비 작업이 있어도 초안을 돌려준다")
    void lastAttemptDoesNotRejectLatePreparation() {
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 10, 30));

        AiDraft draft = validator.toDraft(rawWithSprint3Task("중간 발표 자료 준비"), context, false);

        assertEquals(4, draft.sprints().size());
    }

    @Test
    @DisplayName("일정 이름과 상관없는 작업은 늦어도 건드리지 않는다")
    void unrelatedTaskIsFine() {
        AiDraftContext context = withFixed("중간 발표", LocalDate.of(2026, 10, 30));

        assertDoesNotThrow(() -> validator.toDraft(rawWithSprint3Task("로그인 화면 구현"), context));
    }

    // ---------- 요청하지 않은 기능 / 얼버무림 ----------

    private AiRawDraft rawWithTask(String title, String description) {
        return new AiRawDraft(List.of(sprint("a", new AiRawDraft.Task(title, description, "MEDIUM", 1L, 1, 1)),
            sprint("b", task("작업", 1, 1)), sprint("c", task("작업", 1, 1)), sprint("d", task("작업", 1, 1))));
    }

    @Test
    @DisplayName("사용자가 쓰지 않은 기능(내 정보 등)이 작업 제목에 있으면 다시 만들게 한다")
    void unrequestedFeatureIsRejected() {
        AiDraftException e = assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("내 정보 페이지 UI 개발", "설명"), context(), true, "중고 거래 회원가입 로그인"));

        assertTrue(e.getMessage().contains("내 정보 페이지 UI 개발"));
        assertTrue(e.getMessage().contains("요청하지 않은 기능"));

        assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("마이 페이지", "설명"), context(), true, "중고 거래"));
        assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("푸시 알림 구현", "설명"), context(), true, "중고 거래"));
        assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("관리자 화면 만들기", "설명"), context(), true, "중고 거래"));
    }

    @Test
    @DisplayName("사용자가 쓴 글에 있는 기능이면 허용한다(띄어쓰기는 무시)")
    void requestedFeatureIsAllowed() {
        assertDoesNotThrow(() -> validator.toDraft(rawWithTask("내 정보 페이지 UI 개발", "설명"), context(), true,
            "회원가입, 내정보 수정, 채팅"));
        assertDoesNotThrow(() -> validator.toDraft(rawWithTask("알림 기능 구현", "설명"), context(), true, "채팅과 알림"));
    }

    @Test
    @DisplayName("설명에만 있는 낱말은 보지 않는다")
    void unrequestedWordInDescriptionIsIgnored() {
        assertDoesNotThrow(() -> validator.toDraft(rawWithTask("로그인 화면", "실패하면 알림 문구를 보여준다."), context(), true, "로그인"));
    }

    @Test
    @DisplayName("'A 또는 B'처럼 정하지 않은 말이 있으면 다시 만들게 한다")
    void hedgingIsRejected() {
        AiDraftException e = assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("서버 배포", "AWS 또는 클라우드 서버에 배포한다."), context()));

        assertTrue(e.getMessage().contains("서버 배포"));
        assertTrue(e.getMessage().contains("정하지 않은 말"));

        assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("등록 화면", "이미지 업로드(또는 URL 입력) 기능을 만든다."), context()));
        assertThrows(AiDraftException.class,
            () -> validator.toDraft(rawWithTask("A 또는 B 선택", "설명"), context()));
    }

    @Test
    @DisplayName("'또는'이 없거나 낱말 속에 들어 있으면 통과한다")
    void noHedgingPasses() {
        assertDoesNotThrow(() -> validator.toDraft(rawWithTask("즐겨찾기 추가/제거", "상품을 즐겨찾기하거나 해제한다."), context()));
    }

    @Test
    @DisplayName("여러 흠이 있으면 한 번에 모두 알려 준다")
    void problemsAreReportedTogether() {
        AiRawDraft raw = new AiRawDraft(List.of(
            sprint("a", new AiRawDraft.Task("내 정보 페이지", "설명", "MEDIUM", 1L, 1, 1),
                new AiRawDraft.Task("배포", "AWS 또는 GCP", "MEDIUM", 1L, 2, 1)),
            sprint("b", task("작업", 1, 1)), sprint("c", task("작업", 1, 1)), sprint("d", task("작업", 1, 1))));

        AiDraftException e = assertThrows(AiDraftException.class, () -> validator.toDraft(raw, context(), true, "중고 거래"));

        assertTrue(e.getMessage().contains("요청하지 않은 기능"));
        assertTrue(e.getMessage().contains("정하지 않은 말"));
    }

    @Test
    @DisplayName("마지막 시도(strict=false)에서는 이런 흠이 있어도 초안을 돌려준다")
    void lastAttemptAcceptsBlemishes() {
        AiDraft draft = validator.toDraft(rawWithTask("내 정보 페이지", "AWS 또는 GCP"), context(), false, "중고 거래");

        assertEquals(4, draft.sprints().size());
    }

    // ---------- 역할·작업 순서를 서버가 바로잡기 ----------

    @Test
    @DisplayName("프런트 작업이 백엔드 멤버에게 가 있으면 프런트 멤버로 바꾸고, 다시 만들게 하지 않는다")
    void fixesRoleMismatch() {
        AiDraftContext withRoles = new AiDraftContext(START, END, 2,
            java.util.Map.of(1L, "백엔드", 2L, "프런트엔드"), List.of());
        AiRawDraft raw = new AiRawDraft(List.of(
            sprint("a", new AiRawDraft.Task("인증 인터셉터 및 상태 관리", "설명", "MEDIUM", 1L, 1, 2)),
            sprint("b", task("작업", 1, 1)), sprint("c", task("작업", 1, 1)), sprint("d", task("작업", 1, 1))));

        AiDraft draft = validator.toDraft(raw, withRoles);

        assertEquals(2L, draft.sprints().get(0).tasks().get(0).assigneeUserId());
    }

    @Test
    @DisplayName("최종 배포가 서버 배포 환경 구축과 같은 주에 있어도 환경 구축이 끝난 다음에 시작한다")
    void deployStartsAfterEnvironment() {
        AiRawDraft raw = new AiRawDraft(List.of(
            sprint("a", task("작업", 1, 1)), sprint("b", task("작업", 1, 1)), sprint("c", task("작업", 1, 1)),
            sprint("d",
                new AiRawDraft.Task("서버 배포 환경 구축", "설명", "HIGH", 1L, 2, 3),
                new AiRawDraft.Task("최종 배포 및 문서화", "설명", "HIGH", 2L, 2, 2))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, context(), false).sprints().get(3).tasks();

        assertTrue(tasks.get(1).startDate().isAfter(tasks.get(0).endDate()));
    }

    @Test
    @DisplayName("실제 사례: 멤버 4명의 첫 스프린트에서 역할이 맞고 담당자 작업 사이의 빈 평일이 하루 이하다")
    void realisticFirstSprint() {
        // 1·2: 백엔드, 3·4: 프런트. 시작이 화요일(10/13)이라 둘째 주는 10/20부터예요.
        LocalDate start = LocalDate.of(2026, 10, 13);
        AiDraftContext ctx = new AiDraftContext(start, start.plusDays(41), 2,
            java.util.Map.of(1L, "백엔드 개발", 2L, "백엔드 개발", 3L, "프런트엔드 개발", 4L, "프런트엔드 개발"), List.of());
        AiRawDraft raw = new AiRawDraft(List.of(
            sprint("기반", t("개발 환경 및 브랜치 전략 설정", 1L, 1, 2), t("데이터베이스 스키마 설계", 2L, 1, 3),
                t("프론트엔드 프로젝트 초기화", 3L, 1, 2), t("UI 컴포넌트 라이브러리 구축", 4L, 1, 3),
                t("JWT 기반 로그인 API 개발", 1L, 2, 3), t("회원가입 API 개발", 2L, 2, 2),
                t("로그인 페이지 구현", 3L, 2, 3), t("회원가입 페이지 구현", 4L, 2, 3),
                t("인증 인터셉터 및 상태 관리", 1L, 2, 2)),
            sprint("b", task("작업", 1, 1)), sprint("c", task("작업", 1, 1))));

        List<AiDraft.Task> tasks = validator.toDraft(raw, ctx, false).sprints().get(0).tasks();

        // 프런트 작업(인증 인터셉터 및 상태 관리)이 백엔드 멤버(1)에게 가 있었는데 프런트 멤버로 바뀐다.
        Long interceptor = tasks.get(tasks.size() - 1).assigneeUserId();
        assertTrue(interceptor == 3L || interceptor == 4L);

        // 멤버마다 작업 사이에 비는 평일이 하루 이하다.
        for (long member = 1; member <= 4; member++) {
            List<AiDraft.Task> mine = new ArrayList<>();
            for (AiDraft.Task task : tasks) {
                if (task.assigneeUserId() == member) {
                    mine.add(task);
                }
            }
            mine.sort(java.util.Comparator.comparing(AiDraft.Task::startDate));
            for (int i = 0; i + 1 < mine.size(); i++) {
                LocalDate from = mine.get(i).endDate().plusDays(1);
                LocalDate to = mine.get(i + 1).startDate().minusDays(1);
                int blank = 0;
                for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                    if (day.getDayOfWeek().getValue() < 6) {
                        blank++;
                    }
                }
                assertTrue(blank <= 1);
            }
        }
    }

    private static AiRawDraft.Task t(String title, Long assignee, int week, int days) {
        return new AiRawDraft.Task(title, "설명", "MEDIUM", assignee, week, days);
    }

    // ---------- 조사(와/과) 교정 ----------
    @Test
    @DisplayName("스프린트 이름과 작업 제목·설명의 조사를 고친다")
    void particlesInDraft() {
        AiRawDraft raw = new AiRawDraft(List.of(
            sprint("스프린트 2: 상품 관리과 탐색 기능",
                new AiRawDraft.Task("검색와 필터 만들기", "상품 등록과 조회와 삭제를 만든다.", "HIGH", 1L, 1, 1)),
            sprint("b", task("t", 1, 1)), sprint("c", task("t", 1, 1)), sprint("d", task("t", 1, 1))));

        AiDraft.Sprint sprint = validator.toDraft(raw, context()).sprints().get(0);

        assertEquals("상품 관리와 탐색 기능", sprint.name());
        assertEquals("검색과 필터 만들기", sprint.tasks().get(0).title());
        assertEquals("상품 등록과 조회와 삭제를 만든다.", sprint.tasks().get(0).description());
    }

    // ---------- 저장 직전 확인 ----------

    private AiDraft validDraft() {
        return new AiDraft(
            List.of(new AiDraft.Sprint("a", "g", START, START.plusDays(13),
                List.of(new AiDraft.Task("작업", "d", TaskPriority.HIGH, 1L, START, START.plusDays(2))))),
            List.of(new AiDraft.Event("리뷰", START.plusDays(11))));
    }

    @Test
    @DisplayName("올바른 최종본은 통과한다")
    void applyValidationPasses() {
        assertDoesNotThrow(() -> validator.validateForApply(validDraft(), Set.of(1L)));
    }

    @Test
    @DisplayName("멤버가 아닌 담당자가 있으면 거절한다")
    void applyRejectsOutsider() {
        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> validator.validateForApply(validDraft(), Set.of(2L)));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
    }

    @Test
    @DisplayName("종료일이 시작일보다 빠르면 거절한다")
    void applyRejectsBadDates() {
        AiDraft draft = new AiDraft(
            List.of(new AiDraft.Sprint("a", "g", START.plusDays(5), START, List.of())), List.of());

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> validator.validateForApply(draft, Set.of(1L)));

        assertEquals(ErrorCode.INVALID_SPRINT_DATE, e.getErrorCode());
    }

    @Test
    @DisplayName("스프린트가 하나도 없으면 거절한다")
    void applyRejectsEmpty() {
        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> validator.validateForApply(new AiDraft(List.of(), List.of()), Set.of(1L)));

        assertEquals(ErrorCode.AI_DRAFT_INVALID, e.getErrorCode());
    }
}
