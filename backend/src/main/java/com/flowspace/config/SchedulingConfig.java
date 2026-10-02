package com.flowspace.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// @Scheduled 작업(휴지통 자동 정리 등)을 켜요.
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
