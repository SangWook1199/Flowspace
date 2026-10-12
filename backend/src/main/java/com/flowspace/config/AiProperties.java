package com.flowspace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

// 로컬 AI(Ollama) 설정이에요. application.yaml의 flowspace.ai 아래 값으로 바꿀 수 있어요.
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "flowspace.ai")
public class AiProperties {

    // false로 두면 AI 프로젝트 자동 구성 기능을 꺼요(배포 서버에는 Ollama가 없을 수 있어요).
    private boolean enabled = true;

    private String baseUrl = "http://localhost:11434";

    private String model = "qwen3.6:27b";

    // 모델이 한 번에 읽고 쓸 수 있는 글자(토큰) 크기예요. 크게 할수록 GPU 메모리를 더 써요.
    private int numCtx = 8192;

    // 답변 하나의 최대 길이예요(모델이 끝없이 쓰는 것을 막아요).
    private int numPredict = 6144;

    private double temperature = 0.3;

    // 모델 응답을 기다리는 최대 시간(초)
    private int timeoutSeconds = 600;

    // 초안이 쓸 수 없게 틀리면 처음 시도를 포함해 이 횟수까지 다시 만들어요.
    private int maxAttempts = 3;

    // 동시에 만드는 초안 수(GPU 하나라면 1이 알맞아요)와 기다릴 수 있는 수
    private int maxConcurrentJobs = 1;
    private int maxQueuedJobs = 3;

    // 완성된 초안을 서버 메모리에 보관하는 시간(분)
    private int draftTtlMinutes = 30;
}
