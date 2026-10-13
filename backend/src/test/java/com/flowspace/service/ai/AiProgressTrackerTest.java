package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiProgressInfo;

// 모델이 쓰는 JSON을 받은 만큼 읽어서 퍼센트와 "지금 만든 작업"을 어림하는 규칙을 확인해요.
class AiProgressTrackerTest {

    // 스프린트 3개, 스프린트마다 작업 8개쯤 예상
    private AiProgressTracker tracker() {
        return new AiProgressTracker(3, 8);
    }

    private static String sprint(String name, String... titles) {
        StringBuilder sb = new StringBuilder("{\"name\":\"" + name + "\",\"goal\":\"목표\",\"tasks\":[");

        for (int i = 0; i < titles.length; i++) {
            if (i > 0) {
                sb.append(',');
            }

            sb.append("{\"title\":\"").append(titles[i])
                .append("\",\"description\":\"설명\",\"priority\":\"HIGH\",\"assigneeUserId\":1,\"weekInSprint\":1,\"durationDays\":2}");
        }

        return sb.append("]}").toString();
    }

    @Test
    @DisplayName("글이 오기 시작하면 1%, 첫 스프린트 이름이 나오기 전까지는 그대로다")
    void startsAtOnePercent() {
        AiProgressTracker tracker = tracker();

        assertTrue(tracker.accept("{\"spr"));
        assertEquals(1, tracker.snapshot().percent());
        assertEquals("WRITING", tracker.snapshot().phase());
        assertEquals(0, tracker.snapshot().taskCount());
    }

    @Test
    @DisplayName("끝까지 나온 스프린트 이름과 작업 제목만 읽는다(쓰는 중인 글자는 기다린다)")
    void readsOnlyCompletedStrings() {
        AiProgressTracker tracker = tracker();
        String full = "{\"sprints\":[" + sprint("기반과 인증", "개발 환경 설정", "DB 설계");

        // 두 번째 작업 제목을 쓰는 도중까지만 받은 상태
        tracker.accept(full.substring(0, full.indexOf("DB 설") + 2));

        AiProgressInfo info = tracker.snapshot();

        assertEquals("기반과 인증", info.sprintName());
        assertEquals(1, info.sprintIndex());
        assertEquals(1, info.taskCount());
        assertEquals(List.of("개발 환경 설정"), info.recentTasks());

        tracker.accept(full);

        assertEquals(List.of("개발 환경 설정", "DB 설계"), tracker.snapshot().recentTasks());
        assertEquals(2, tracker.snapshot().taskCount());
    }

    @Test
    @DisplayName("퍼센트는 끝난 스프린트와 지금 스프린트의 작업 수로 어림하고, 줄어들지 않는다")
    void percentGrows() {
        AiProgressTracker tracker = tracker();
        StringBuilder text = new StringBuilder("{\"sprints\":[");
        int last = 0;

        // 스프린트 1: 작업 4개(예상 8개의 절반) → 약 16%
        text.append(sprint("하나", "a1", "a2", "a3", "a4"));
        tracker.accept(text.toString());
        assertEquals(16, tracker.snapshot().percent());

        // 스프린트 2가 시작 → 스프린트 1은 끝난 것 → 33%
        text.append(',').append(sprint("둘", "b1"));
        tracker.accept(text.toString());
        assertTrue(tracker.snapshot().percent() >= 33);
        assertEquals(2, tracker.snapshot().sprintIndex());
        assertEquals("둘", tracker.snapshot().sprintName());

        last = tracker.snapshot().percent();

        // 같은 글을 다시 받아도 줄지 않고, 바뀐 게 없으면 false
        assertFalse(tracker.accept(text.toString()));
        assertEquals(last, tracker.snapshot().percent());
    }

    @Test
    @DisplayName("예상보다 작업을 많이 써도 스프린트 몫의 95%까지만 채우고, 글을 쓰는 동안은 97%를 넘지 않는다")
    void percentIsCapped() {
        AiProgressTracker tracker = new AiProgressTracker(1, 2);

        String[] titles = new String[10];

        for (int i = 0; i < titles.length; i++) {
            titles[i] = "작업" + i;
        }

        tracker.accept("{\"sprints\":[" + sprint("하나", titles));

        assertEquals(95, tracker.snapshot().percent());
        assertEquals(10, tracker.snapshot().taskCount());
        // 최근 작업은 6개까지만 담는다
        assertEquals(AiProgressTracker.RECENT_TASKS, tracker.snapshot().recentTasks().size());
        assertEquals("작업9", tracker.snapshot().recentTasks().get(AiProgressTracker.RECENT_TASKS - 1));
    }

    @Test
    @DisplayName("모델이 스프린트를 더 많이 써도 스프린트 번호와 퍼센트가 범위를 넘지 않는다")
    void extraSprintsStayInRange() {
        AiProgressTracker tracker = new AiProgressTracker(2, 4);

        tracker.accept("{\"sprints\":[" + sprint("하나", "a") + "," + sprint("둘", "b") + "," + sprint("셋", "c"));

        AiProgressInfo info = tracker.snapshot();

        assertEquals(2, info.sprintIndex());
        assertEquals(2, info.sprintCount());
        assertTrue(info.percent() <= 97);
    }

    @Test
    @DisplayName("글을 다 받아 검사하는 단계는 99%이고, 이스케이프된 글자는 풀어서 보여준다")
    void checkingAndEscapes() {
        AiProgressTracker tracker = tracker();

        tracker.accept("{\"sprints\":[" + sprint("하나", "따옴표 \\\"포함\\\" 작업"));

        assertEquals("따옴표 \"포함\" 작업", tracker.snapshot().recentTasks().get(0));

        AiProgressInfo checking = tracker.checking();

        assertEquals("CHECKING", checking.phase());
        assertEquals(99, checking.percent());
    }

    @Test
    @DisplayName("작업 설명 안에 title이라는 글자가 있어도 작업으로 세지 않는다")
    void ignoresKeywordsInsideStrings() {
        AiProgressTracker tracker = tracker();

        tracker.accept("{\"sprints\":[{\"name\":\"하나\",\"goal\":\"g\",\"tasks\":[{\"title\":\"작업\","
            + "\"description\":\"설명에 \\\"title\\\": \\\"가짜\\\" 가 있어요\",\"priority\":\"LOW\"}");

        assertEquals(1, tracker.snapshot().taskCount());
        assertEquals(List.of("작업"), tracker.snapshot().recentTasks());
    }
}
