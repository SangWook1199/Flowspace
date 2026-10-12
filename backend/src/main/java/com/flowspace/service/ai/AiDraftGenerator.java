package com.flowspace.service.ai;

import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiProjectRequest;
import com.flowspace.dto.ai.AiRawDraft;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 모델에게 초안을 만들게 하고, 믿을 수 있는 초안(AiDraft)이 될 때까지 검증하며 다시 시켜요.
// 쓸 수 없게 틀리면 "무엇이 틀렸는지"를 알려주고 처음부터 다시 만들게 해요(최대 maxAttempts번).
// 모델 서버 문제(연결·시간 초과)는 다시 해도 소용없어서 바로 멈춰요.
@Slf4j
@Component
@RequiredArgsConstructor
public class AiDraftGenerator {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    // 진행 상황을 알리고 취소 여부를 물어보는 창구예요.
    public interface Listener {

        default boolean isCancelled() {
            return false;
        }

        default void onAttempt(int attempt, int maxAttempts) {
        }
    }

    private final AiModelClient client;
    private final AiPromptBuilder promptBuilder;
    private final AiDraftValidator validator;
    private final AiProperties properties;

    public AiDraft generate(AiProjectRequest request, Map<Long, String> nicknames, AiDraftContext context,
        Listener listener) {

        int maxAttempts = Math.max(1, properties.getMaxAttempts());
        String problem = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {

            if (listener.isCancelled()) {
                throw new AiJobCancelledException();
            }

            listener.onAttempt(attempt, maxAttempts);

            String content = client.chat(promptBuilder.build(request, nicknames, context, problem),
                promptBuilder.schema(context, nicknames.keySet()));

            try {
                return validator.toDraft(parse(content), context, attempt < maxAttempts, requestText(request));

            } catch (AiDraftException e) {
                problem = e.getMessage();
            } catch (JsonProcessingException e) {
                problem = "JSON 형식이 올바르지 않아요. 스키마에 맞는 JSON만 출력해 주세요.";
            }

            log.info("AI 초안이 쓸 수 없어 다시 만들어요. attempt={}/{}, problem={}", attempt, maxAttempts, problem);
        }

        throw new AiGenerationFailedException("AI가 쓸 수 있는 초안을 만들지 못했어요. 입력을 조금 더 구체적으로 쓰고 다시 시도해 주세요.");
    }

    // 사용자가 직접 쓴 주제·핵심 기능 등이에요(여기 적힌 기능은 "요청한 기능"으로 봐요).
    private static String requestText(AiProjectRequest request) {

        StringBuilder sb = new StringBuilder();

        for (String text : new String[] {request.topic(), request.features(), request.techStack(), request.projectType()}) {
            if (text != null) {
                sb.append(text).append(' ');
            }
        }

        return sb.toString();
    }

    // 모델이 JSON 앞뒤에 설명이나 ```를 붙여도 가장 바깥 { } 만 읽어요.
    static AiRawDraft parse(String content) throws JsonProcessingException {

        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');

        if (start < 0 || end <= start) {
            throw new AiDraftException("JSON 형식이 올바르지 않아요. 스키마에 맞는 JSON만 출력해 주세요.");
        }

        return OBJECT_MAPPER.readValue(content.substring(start, end + 1), AiRawDraft.class);
    }
}
