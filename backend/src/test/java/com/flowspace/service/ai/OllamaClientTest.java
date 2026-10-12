package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowspace.config.AiProperties;
import com.sun.net.httpserver.HttpServer;

// 진짜 Ollama 대신 이 컴퓨터에 작은 가짜 서버를 띄워서, 어떤 요청을 보내고 어떤 답을 읽는지 확인해요.
class OllamaClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private HttpServer server;
    private final AtomicReference<String> lastBody = new AtomicReference<>();
    private final AtomicReference<String> lastPath = new AtomicReference<>();

    private OllamaClient start(int status, String responseBody) throws IOException {

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            lastPath.set(exchange.getRequestURI().getPath());
            lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));

            byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);

            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
        server.start();

        return new OllamaClient(properties("http://127.0.0.1:" + server.getAddress().getPort()));
    }

    private AiProperties properties(String baseUrl) {
        AiProperties properties = new AiProperties();
        properties.setBaseUrl(baseUrl);
        properties.setModel("qwen3.6:27b");
        properties.setTimeoutSeconds(5);

        return properties;
    }

    private void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    private static final List<AiModelClient.Message> MESSAGES = List.of(new AiModelClient.Message("system", "규칙"),
        new AiModelClient.Message("user", "질문 한글"));

    @Test
    @DisplayName("스키마·옵션을 담아 /api/chat에 보내고, 답의 content를 돌려준다")
    void chatSendsRequestAndReadsContent() throws Exception {
        try {
            OllamaClient client = start(200, "{\"message\":{\"role\":\"assistant\",\"content\":\"{\\\"ok\\\":true}\"},\"done\":true}");

            String content = client.chat(MESSAGES, Map.of("type", "object"));

            assertEquals("{\"ok\":true}", content);
            assertEquals("/api/chat", lastPath.get());

            JsonNode body = MAPPER.readTree(lastBody.get());

            assertEquals("qwen3.6:27b", body.path("model").asText());
            assertFalse(body.path("stream").asBoolean(true));
            assertFalse(body.path("think").asBoolean(true));
            assertEquals("object", body.path("format").path("type").asText());
            assertEquals(8192, body.path("options").path("num_ctx").asInt());
            assertEquals(6144, body.path("options").path("num_predict").asInt());
            assertEquals(0.3, body.path("options").path("temperature").asDouble(), 0.0001);
            assertEquals("system", body.path("messages").get(0).path("role").asText());
            assertEquals("질문 한글", body.path("messages").get(1).path("content").asText());
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("모델이 없으면(404) 모델을 확인하라고 알려준다")
    void modelNotFound() throws Exception {
        try {
            OllamaClient client = start(404, "{\"error\":\"model not found\"}");

            AiModelException e = assertThrows(AiModelException.class, () -> client.chat(MESSAGES, Map.of()));

            assertTrue(e.getMessage().contains("모델을 찾을 수 없어요"));
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("서버 오류는 상태 코드를 담아 알려준다")
    void serverError() throws Exception {
        try {
            OllamaClient client = start(500, "boom");

            AiModelException e = assertThrows(AiModelException.class, () -> client.chat(MESSAGES, Map.of()));

            assertTrue(e.getMessage().contains("500"));
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("빈 답이나 모양이 다른 답은 예외로 알린다")
    void emptyOrBrokenAnswer() throws Exception {
        try {
            OllamaClient empty = start(200, "{\"message\":{\"content\":\"\"}}");
            assertThrows(AiModelException.class, () -> empty.chat(MESSAGES, Map.of()));
        } finally {
            stop();
        }

        try {
            OllamaClient broken = start(200, "not json");
            assertThrows(AiModelException.class, () -> broken.chat(MESSAGES, Map.of()));
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("서버가 꺼져 있으면 Ollama를 확인하라고 알려준다")
    void connectionRefused() throws Exception {
        start(200, "{}");
        String url = "http://127.0.0.1:" + server.getAddress().getPort();
        stop();

        OllamaClient down = new OllamaClient(properties(url));

        AiModelException e = assertThrows(AiModelException.class, () -> down.chat(MESSAGES, Map.of()));

        assertTrue(e.getMessage().contains("연결할 수 없어요"));
        assertFalse(down.isAvailable());
    }

    @Test
    @DisplayName("설정한 모델이 내려받아져 있으면 사용할 수 있다고 본다")
    void availableWhenModelListed() throws Exception {
        try {
            OllamaClient client = start(200, "{\"models\":[{\"name\":\"gemma4:12b\"},{\"name\":\"qwen3.6:27b\"}]}");

            assertTrue(client.isAvailable());
            assertEquals("/api/tags", lastPath.get());
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("설정한 모델이 목록에 없으면 사용할 수 없다고 본다")
    void unavailableWhenModelMissing() throws Exception {
        try {
            OllamaClient client = start(200, "{\"models\":[{\"name\":\"gemma4:12b\"}]}");

            assertFalse(client.isAvailable());
        } finally {
            stop();
        }
    }

    @Test
    @DisplayName("태그를 안 쓴 모델 이름은 같은 이름의 어떤 태그와도 맞는다")
    void modelNameWithoutTag() throws Exception {
        JsonNode tags = MAPPER.readTree("{\"models\":[{\"name\":\"qwen3.6:27b\"}]}");

        assertTrue(OllamaClient.hasModel(tags, "qwen3.6"));
        assertTrue(OllamaClient.hasModel(tags, "qwen3.6:27b"));
        assertFalse(OllamaClient.hasModel(tags, "qwen3.6:8b"));
        assertFalse(OllamaClient.hasModel(tags, "qwen"));
    }
}
