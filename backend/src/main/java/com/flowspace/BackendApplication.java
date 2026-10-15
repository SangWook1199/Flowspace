package com.flowspace;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		// 서버 컴퓨터의 시간대와 상관없이 한국 시간으로 맞춰요 — 매일 9시 마감 알림·새벽 정리 작업(@Scheduled)과
		// LocalDateTime.now()가 모두 이 시간대를 따라서, 시간대가 UTC인 서버에서 알림이 9시간 어긋나는 걸 막아요.
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));

		SpringApplication.run(BackendApplication.class, args);
	}

}
