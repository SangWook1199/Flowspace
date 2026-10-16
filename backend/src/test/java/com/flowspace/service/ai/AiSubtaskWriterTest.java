package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiProgressInfo;
import com.flowspace.entity.enums.TaskPriority;

// 작업마다 기본적인 하위 작업이 2개 이상 붙는지 확인해요. 모델이 못 만들거나 이상한 글을 줘도 기본 항목으로 채워지는지도 봐요.
class AiSubtaskWriterTest {

    private static final LocalDate START = LocalDate.of(2026, 10, 12);

    // 준비해 둔 답을 차례로 돌려주는 가짜 모델이에요. 받은 질문도 기록해요.
    static class FakeModel implements AiModelClient {

        final List<Object> answers = new ArrayList<>();
        final List<List<Message>> received = new ArrayList<>();

        FakeModel answer(Object answer) {
            answers.add(answer);
            return this;
        }

        @Override
        public String chat(List<Message> messages, Map<String, Object> schema) {
            received.add(messages);

            Object next = answers.get(Math.min(received.size() - 1, answers.size() - 1));

            if (next instanceof RuntimeException e) {
                throw e;
            }

            return (String) next;
        }

        @Override
        public boolean isAvailable() {
            return true;
        }
    }

    private static AiDraft.Task task(String title) {
        return new AiDraft.Task(title, "설명", TaskPriority.MEDIUM, 1L, START, START.plusDays(1));
    }

    private static AiDraft.Sprint sprint(String name, String... titles) {
        List<AiDraft.Task> tasks = new ArrayList<>();

        for (String title : titles) {
            tasks.add(task(title));
        }

        return new AiDraft.Sprint(name, "목표", START, START.plusDays(13), tasks);
    }

    private static AiDraft draft(AiDraft.Sprint... sprints) {
        return new AiDraft(List.of(sprints), List.of(new AiDraft.Event("스프린트 리뷰", START.plusDays(11))));
    }

    private static String answer(String... itemsJson) {
        return "{\"tasks\":[" + String.join(",", itemsJson) + "]}";
    }

    private static String item(int number, String... subtasks) {
        StringBuilder sb = new StringBuilder("{\"number\":").append(number).append(",\"subtasks\":[");

        for (int i = 0; i < subtasks.length; i++) {
            sb.append(i == 0 ? "" : ",").append('"').append(subtasks[i]).append('"');
        }

        return sb.append("]}").toString();
    }

    private AiDraft run(FakeModel model, AiDraft draft) {
        return new AiSubtaskWriter(model).addSubtasks(draft, "쇼핑몰", new AiSubtaskWriter.Listener() {
        });
    }

    @Test
    @DisplayName("모델이 준 하위 작업이 작업마다 붙고, 작업의 다른 값은 그대로다")
    void attachesSubtasksToEachTask() {
        FakeModel model = new FakeModel().answer(answer(item(1, "회원가입 화면 구성", "회원가입 API 연결"),
            item(2, "로그인 요청 처리 구현", "JWT 발급과 검증", "오류 응답 처리")));

        AiDraft draft = run(model, draft(sprint("로그인", "회원가입 화면 구현", "JWT 로그인 API 개발")));

        List<AiDraft.Task> tasks = draft.sprints().get(0).tasks();

        assertEquals(List.of("회원가입 화면 구성", "회원가입 API 연결"), tasks.get(0).subtasks());
        assertEquals(List.of("로그인 요청 처리 구현", "JWT 발급과 검증", "오류 응답 처리"), tasks.get(1).subtasks());

        assertEquals("회원가입 화면 구현", tasks.get(0).title());
        assertEquals(TaskPriority.MEDIUM, tasks.get(0).priority());
        assertEquals(START, tasks.get(0).startDate());
        assertEquals("로그인", draft.sprints().get(0).name());
        assertEquals(1, draft.events().size());
    }

    @Test
    @DisplayName("모델이 하나만 주거나 빠뜨린 작업은 기본 항목으로 2개를 채운다")
    void fillsMissingSubtasks() {
        FakeModel model = new FakeModel().answer(answer(item(1, "회원가입 화면 구성")));

        AiDraft draft = run(model, draft(sprint("로그인", "회원가입 화면 구현", "프로필 화면 구현")));

        List<AiDraft.Task> tasks = draft.sprints().get(0).tasks();

        assertEquals(List.of("회원가입 화면 구성", "동작 확인 및 정리"), tasks.get(0).subtasks());
        assertEquals(AiSubtaskWriter.FALLBACKS, tasks.get(1).subtasks());
    }

    @Test
    @DisplayName("한자·빈 글·중복·작업 제목과 같은 글은 버리고 최대 4개까지만 둔다")
    void dropsBadItemsAndCapsAtFour() {
        FakeModel model = new FakeModel().answer(answer(item(1, "화면 구성", "화면 구성", "  ", "테스트中发现", "회원가입 화면 구현",
            "API 연결", "검증", "문서화", "정리 작업")));

        AiDraft draft = run(model, draft(sprint("로그인", "회원가입 화면 구현")));

        assertEquals(List.of("화면 구성", "API 연결", "검증", "문서화"), draft.sprints().get(0).tasks().get(0).subtasks());
    }

    @Test
    @DisplayName("모델 서버가 응답하지 못하면 기본 항목으로 채우고 나머지 스프린트는 모델을 부르지 않는다")
    void modelFailureFallsBackWithoutMoreCalls() {
        FakeModel model = new FakeModel().answer(new AiModelException("AI 모델에 연결할 수 없어요."));

        AiDraft draft = run(model, draft(sprint("하나", "작업 A"), sprint("둘", "작업 B", "작업 C")));

        assertEquals(1, model.received.size());

        for (AiDraft.Sprint sprint : draft.sprints()) {
            for (AiDraft.Task task : sprint.tasks()) {
                assertEquals(AiSubtaskWriter.FALLBACKS, task.subtasks());
            }
        }
    }

    @Test
    @DisplayName("답을 읽을 수 없으면 그 스프린트만 기본 항목이 되고 다음 스프린트는 이어서 만든다")
    void brokenAnswerOnlyAffectsThatSprint() {
        FakeModel model = new FakeModel().answer("JSON이 아니에요").answer(answer(item(1, "목록 화면 구성", "목록 API 연결")));

        AiDraft draft = run(model, draft(sprint("하나", "작업 A"), sprint("둘", "목록 화면 구현")));

        assertEquals(2, model.received.size());
        assertEquals(AiSubtaskWriter.FALLBACKS, draft.sprints().get(0).tasks().get(0).subtasks());
        assertEquals(List.of("목록 화면 구성", "목록 API 연결"), draft.sprints().get(1).tasks().get(0).subtasks());
    }

    @Test
    @DisplayName("번호가 범위를 벗어나면 나온 순서로 본다")
    void outOfRangeNumberUsesOrder() {
        FakeModel model = new FakeModel().answer(answer(item(9, "첫째 단계", "둘째 단계")));

        AiDraft draft = run(model, draft(sprint("하나", "작업 A")));

        assertEquals(List.of("첫째 단계", "둘째 단계"), draft.sprints().get(0).tasks().get(0).subtasks());
    }

    @Test
    @DisplayName("취소됐으면 모델을 부르지 않고 멈춘다")
    void cancelledStopsBeforeCallingModel() {
        FakeModel model = new FakeModel().answer(answer(item(1, "a단계", "b단계")));

        assertThrows(AiJobCancelledException.class, () -> new AiSubtaskWriter(model)
            .addSubtasks(draft(sprint("하나", "작업 A")), "쇼핑몰", new AiSubtaskWriter.Listener() {
                @Override
                public boolean isCancelled() {
                    return true;
                }
            }));

        assertEquals(0, model.received.size());
    }

    @Test
    @DisplayName("스프린트마다 진행 상황을 SUBTASKS 단계로 알린다")
    void reportsProgressPerSprint() {
        FakeModel model = new FakeModel().answer(answer(item(1, "a단계", "b단계")));
        List<AiProgressInfo> reported = new ArrayList<>();

        new AiSubtaskWriter(model).addSubtasks(draft(sprint("하나", "작업 A"), sprint("둘", "작업 B")), "쇼핑몰",
            new AiSubtaskWriter.Listener() {
                @Override
                public void onProgress(AiProgressInfo progress) {
                    reported.add(progress);
                }
            });

        assertEquals(2, reported.size());
        assertEquals("SUBTASKS", reported.get(0).phase());
        assertEquals(List.of(1, 2), reported.stream().map(AiProgressInfo::sprintIndex).toList());
        assertEquals(2, reported.get(0).sprintCount());
        assertEquals("하나", reported.get(0).sprintName());
        assertEquals(List.of("작업 A"), reported.get(0).recentTasks());
    }

    @Test
    @DisplayName("질문에는 사용자 주제가 표시와 함께 들어가고 작업이 번호순으로 나온다")
    void promptHasTopicAndNumberedTasks() {
        FakeModel model = new FakeModel().answer(answer(item(1, "a단계", "b단계"), item(2, "c단계", "d단계")));

        run(model, draft(sprint("로그인", "회원가입 화면 구현", "JWT 로그인 API 개발")));

        String system = model.received.get(0).get(0).content();
        String user = model.received.get(0).get(1).content();

        assertTrue(system.contains("2~4개"));
        assertTrue(user.contains("<사용자입력>쇼핑몰</사용자입력>"));
        assertTrue(user.contains("1. 회원가입 화면 구현"));
        assertTrue(user.contains("2. JWT 로그인 API 개발"));
    }

    @Test
    @DisplayName("스프린트가 없는 초안은 그대로 돌려준다")
    void emptyDraftIsReturnedAsIs() {
        FakeModel model = new FakeModel().answer("사용하지 않아요");
        AiDraft empty = new AiDraft(List.of(), List.of());

        assertSame(empty, run(model, empty));
        assertNull(run(model, null));
        assertEquals(0, model.received.size());
    }
}
