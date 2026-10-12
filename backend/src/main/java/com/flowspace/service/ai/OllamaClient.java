package com.flowspace.service.ai;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowspace.config.AiProperties;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 내 컴퓨터(또는 서버)에서 도는 Ollama의 /api/chat을 불러요.
// format에 JSON 스키마를 넘기면 모델이 그 모양의 JSON만 만들고, think=false로 생각 과정을 꺼서 빠르게 답해요.
@Slf4j
@Component
@RequiredArgsConstructor
public class OllamaClient implements AiModelClient {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final AiProperties properties;

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    @Override
    public String chat(List<Message> messages, Map<String, Object> schema) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages.stream().map(m -> Map.of("role", m.role(), "content", m.content())).toList());
        body.put("stream", false);
        body.put("think", false);
        body.put("format", schema);
        body.put("options", Map.of("temperature", properties.getTemperature(), "num_ctx", properties.getNumCtx(),
            "num_predict", properties.getNumPredict()));

        HttpResponse<String> response;

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl() + "/api/chat"))
                .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                .header("Content-Type", "application/json")
                .POST(BodyPublishers.ofString(OBJECT_MAPPER.writeValueAsString(body), StandardCharsets.UTF_8)).build();

            response = httpClient.send(request, BodyHandlers.ofString(StandardCharsets.UTF_8));

        } catch (HttpConnectTimeoutException e) {
            throw new AiModelException("AI 모델에 연결할 수 없어요. Ollama가 켜져 있는지 확인해 주세요.");
        } catch (HttpTimeoutException e) {
            throw new AiModelException("AI가 너무 오래 걸려서 멈췄어요. 기간을 줄이거나 잠시 뒤에 다시 시도해 주세요.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiModelException("AI 작업이 중단됐어요.");
        } catch (IOException e) {
            log.warn("Ollama 연결 실패: {}", e.toString());
            throw new AiModelException("AI 모델에 연결할 수 없어요. Ollama가 켜져 있는지 확인해 주세요.");
        }

        if (response.statusCode() != 200) {
            log.warn("Ollama 응답 오류: status={}, body={}", response.statusCode(), abbreviate(response.body()));

            if (response.statusCode() == 404) {
                throw new AiModelException("설정한 AI 모델을 찾을 수 없어요. 모델이 내려받아져 있는지 확인해 주세요.");
            }

            throw new AiModelException("AI 모델이 오류를 돌려줬어요(" + response.statusCode() + ").");
        }

        try {
            String content = OBJECT_MAPPER.readTree(response.body()).path("message").path("content").asText("");

            if (content.isBlank()) {
                throw new AiModelException("AI가 빈 답을 돌려줬어요.");
            }

            return content;

        } catch (JsonProcessingException e) {
            throw new AiModelException("AI 응답을 읽을 수 없어요.");
        }
    }

    @Override
    public boolean isAvailable() {

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl() + "/api/tags"))
                .timeout(Duration.ofSeconds(2)).GET().build();

            HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() != 200) {
                return false;
            }

            return hasModel(OBJECT_MAPPER.readTree(response.body()), properties.getModel());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException | RuntimeException e) {
            return false;
        }
    }

    // 태그를 안 쓴 이름(qwen3.6)은 qwen3.6:27b 같은 것과도 맞는 걸로 봐요.
    static boolean hasModel(JsonNode tags, String model) {

        for (JsonNode item : tags.path("models")) {
            String name = item.path("name").asText("");

            if (name.equals(model) || (!model.contains(":") && name.startsWith(model + ":"))) {
                return true;
            }
        }

        return false;
    }

    private String baseUrl() {
        String url = properties.getBaseUrl();

        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String abbreviate(String value) {
        return value == null || value.length() <= 300 ? value : value.substring(0, 300) + "...";
    }
}
