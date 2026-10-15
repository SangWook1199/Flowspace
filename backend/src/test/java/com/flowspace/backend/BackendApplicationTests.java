package com.flowspace.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

// 실제 DB가 필요한 테스트라서 GitHub Actions(CI=true)에서는 건너뛰어요. 내 PC에서는 그대로 실행돼요.
@DisabledIfEnvironmentVariable(named = "CI", matches = "true")
@SpringBootTest
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
