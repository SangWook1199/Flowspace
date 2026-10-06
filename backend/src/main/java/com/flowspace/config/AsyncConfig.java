package com.flowspace.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// @Async 작업(메일 발송 등)을 요청 처리와 따로 돌려요.
@Configuration
@EnableAsync
public class AsyncConfig {
}
