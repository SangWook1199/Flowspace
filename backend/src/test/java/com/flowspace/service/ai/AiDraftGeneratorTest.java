package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiProjectRequest;

class AiDraftGeneratorTest {

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

    private final AiDraftValidator validator = new AiDraftValidator();
    private final AiPromptBuilder promptBuilder = new AiPromptBuilder();

    private final AiProjectRequest request = new AiProjectRequest("쇼핑몰", LocalDate.of(2026, 10, 12),
        LocalDate.of(2026, 12, 6), 2,
        List.of(new AiProjectRequest.Member(1L, "백엔드"), new AiProjectRequest.Member(2L, "프런트")), null, null,
        List.of(new AiProjectRequest.FixedEvent("중간 발표", LocalDate.of(2026, 11, 20))), null, null, null);

    private final AiDraftContext context = new AiDraftContext(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 12, 6),
        2, Set.of(1L, 2L), List.of(new AiDraftContext.FixedEvent("중간 발표", LocalDate.of(2026, 11, 20))));

    private Map<Long, String> names() {
        Map<Long, String> names = new LinkedHashMap<>();
        names.put(1L, "철수");
        names.put(2L, "영희");
        return names;
    }

    private AiDraftGenerator generator(AiModelClient client) {
        AiProperties properties = new AiProperties();
        properties.setMaxAttempts(3);

        return new AiDraftGenerator(client, promptBuilder, validator, properties);
    }

    private static String json(int sprints) {
        StringBuilder sb = new StringBuilder("{\"sprints\":[");

        for (int i = 0; i < sprints; i++) {
            if (i > 0) {
                sb.append(',');
            }

            sb.append("{\"name\":\"스프린트 ").append(i + 1).append(": 기능 ").append(i + 1)
                .append("\",\"goal\":\"목표\",\"tasks\":[{\"title\":\"작업\",\"description\":\"설명\",")
                .append("\"priority\":\"HIGH\",\"assigneeUserId\":1,\"weekInSprint\":1,\"durationDays\":2}]}");
        }

        return sb.append("]}").toString();
    }

    @Test
    @DisplayName("처음 답이 괜찮으면 한 번만 부르고, 고정 일정과 서버가 만든 스프린트 리뷰를 함께 돌려준다")
    void succeedsFirstTime() {
        FakeModel model = new FakeModel().answer(json(4));

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(1, model.received.size());
        assertEquals(4, draft.sprints().size());
        assertEquals("기능 1", draft.sprints().get(0).name());
        // 고정 일정 1개 + 스프린트 리뷰 4개
        assertEquals(5, draft.events().size());
    }

    @Test
    @DisplayName("스프린트가 모자라면 무엇이 틀렸는지 알려주고 다시 만든다")
    void retriesWithProblem() {
        FakeModel model = new FakeModel().answer(json(2)).answer(json(4));

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(2, model.received.size());
        assertEquals(4, draft.sprints().size());
        assertTrue(model.received.get(1).get(1).content().contains("스프린트가 2개뿐이에요"));
    }

    @Test
    @DisplayName("JSON이 아닌 답이 와도 다시 만든다")
    void retriesOnBrokenJson() {
        FakeModel model = new FakeModel().answer("죄송합니다, 만들 수 없어요.").answer("{\"sprints\": [").answer(json(4));

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(3, model.received.size());
        assertEquals(4, draft.sprints().size());
    }

    @Test
    @DisplayName("정해진 일정보다 늦은 준비 작업은 두 번 다시 만들게 하고, 마지막 시도에서는 그대로 받아 준다")
    void lateTaskRetriesThenAcceptedOnLastAttempt() {
        // 마지막 스프린트(11/23~)에 "중간 발표" 준비 작업이 있는데 중간 발표는 11/20이에요.
        String late = json(4);
        int last = late.lastIndexOf("\"title\":\"작업\"");
        late = late.substring(0, last) + "\"title\":\"중간 발표 자료 준비\"" + late.substring(last + "\"title\":\"작업\"".length());

        FakeModel model = new FakeModel().answer(late);

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(3, model.received.size());
        assertEquals(4, draft.sprints().size());
        assertTrue(model.received.get(1).get(1).content().contains("중간 발표"));
    }

    @Test
    @DisplayName("요청하지 않은 기능이 있으면 이유를 알려 주고 다시 만든다")
    void retriesOnUnrequestedFeature() {
        String bad = json(4).replaceFirst("\"title\":\"작업\"", "\"title\":\"내 정보 페이지 UI 개발\"");

        FakeModel model = new FakeModel().answer(bad).answer(json(4));

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(2, model.received.size());
        assertEquals(4, draft.sprints().size());
        assertTrue(model.received.get(1).get(1).content().contains("요청하지 않은 기능"));
    }

    @Test
    @DisplayName("JSON 앞뒤에 코드 블록 표시가 붙어도 읽는다")
    void parsesFencedJson() {
        FakeModel model = new FakeModel().answer("```json\n" + json(4) + "\n```");

        AiDraft draft = generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
        });

        assertEquals(4, draft.sprints().size());
    }

    @Test
    @DisplayName("계속 틀리면 정해진 횟수까지만 해 보고 실패로 끝낸다")
    void failsAfterMaxAttempts() {
        FakeModel model = new FakeModel().answer(json(1));

        assertThrows(AiGenerationFailedException.class,
            () -> generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
            }));

        assertEquals(3, model.received.size());
    }

    @Test
    @DisplayName("모델 서버 문제는 다시 해도 소용없어서 바로 멈춘다")
    void modelProblemStopsImmediately() {
        FakeModel model = new FakeModel().answer(new AiModelException("연결할 수 없어요."));

        AiModelException e = assertThrows(AiModelException.class,
            () -> generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {
            }));

        assertEquals("연결할 수 없어요.", e.getMessage());
        assertEquals(1, model.received.size());
    }

    @Test
    @DisplayName("시작 전에 취소됐으면 모델을 부르지 않는다")
    void cancelledBeforeStart() {
        FakeModel model = new FakeModel().answer(json(4));

        assertThrows(AiJobCancelledException.class,
            () -> generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {

                @Override
                public boolean isCancelled() {
                    return true;
                }
            }));

        assertEquals(0, model.received.size());
    }

    @Test
    @DisplayName("다시 만드는 사이에 취소되면 거기서 멈춘다")
    void cancelledBetweenAttempts() {
        FakeModel model = new FakeModel().answer(json(1));
        List<Integer> attempts = new ArrayList<>();

        assertThrows(AiJobCancelledException.class,
            () -> generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {

                @Override
                public boolean isCancelled() {
                    return attempts.size() >= 1;
                }

                @Override
                public void onAttempt(int attempt, int maxAttempts) {
                    attempts.add(attempt);
                    assertEquals(3, maxAttempts);
                }
            }));

        assertEquals(List.of(1), attempts);
        assertEquals(1, model.received.size());
    }

    // 답을 한 번에 주지 않고 앞에서부터 조금씩 잘라서 onPartial로 흘려 주는 가짜 모델이에요.
    static class StreamingModel extends FakeModel {

        @Override
        public String chat(List<Message> messages, Map<String, Object> schema,
            java.util.function.Consumer<String> onPartial) {
            String content = chat(messages, schema);

            for (int end = 40; end < content.length(); end += 40) {
                onPartial.accept(content.substring(0, end));
            }

            onPartial.accept(content);

            return content;
        }
    }

    @Test
    @DisplayName("모델이 글을 쓰는 동안 퍼센트와 만든 작업이 올라가고, 다 받으면 검사 단계(99%)를 알린다")
    void reportsProgress() {
        StreamingModel model = new StreamingModel();
        model.answer(json(4));

        List<com.flowspace.dto.ai.AiProgressInfo> reports = new ArrayList<>();

        generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {

            @Override
            public void onProgress(com.flowspace.dto.ai.AiProgressInfo progress) {
                reports.add(progress);
            }
        });

        assertTrue(reports.size() >= 3);

        int previous = 0;

        for (com.flowspace.dto.ai.AiProgressInfo report : reports) {
            assertTrue(report.percent() >= previous); // 퍼센트가 줄어들면 안 돼요
            previous = report.percent();
        }

        com.flowspace.dto.ai.AiProgressInfo last = reports.get(reports.size() - 1);

        assertEquals("CHECKING", last.phase());
        assertEquals(99, last.percent());
        assertEquals(4, last.sprintCount());
        assertEquals(4, last.taskCount());
        assertEquals("작업", last.recentTasks().get(last.recentTasks().size() - 1));
    }

    @Test
    @DisplayName("글을 받는 도중에 취소되면 바로 멈춘다")
    void cancelsWhileStreaming() {
        StreamingModel model = new StreamingModel();
        model.answer(json(4));

        java.util.concurrent.atomic.AtomicInteger checks = new java.util.concurrent.atomic.AtomicInteger();

        assertThrows(AiJobCancelledException.class,
            () -> generator(model).generate(request, names(), context, new AiDraftGenerator.Listener() {

                // 첫 확인(시도 시작 때)은 통과하고, 글을 받는 중에 취소돼요.
                @Override
                public boolean isCancelled() {
                    return checks.incrementAndGet() > 1;
                }
            }));
    }
}
