package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

class AuthRateLimiterTest {

    private static final String IP = "203.0.113.7";
    private static final String EMAIL = "user@example.com";

    // 시간을 직접 움직이는 가짜 시계
    private AtomicLong now;
    private AuthRateLimiter limiter;

    @BeforeEach
    void setUp() {
        now = new AtomicLong(1_000_000L);
        limiter = new AuthRateLimiter(now::get);
    }

    private void failLogin(int times, String ip, String email) {
        for (int i = 0; i < times; i++) {
            limiter.checkLoginAllowed(ip, email);
            limiter.recordLoginFailure(ip, email);
        }
    }

    @Test
    @DisplayName("한도 안에서 틀리는 동안에는 로그인을 막지 않는다")
    void loginAllowedUnderLimit() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT - 1, IP, EMAIL);

        assertDoesNotThrow(() -> limiter.checkLoginAllowed(IP, EMAIL));
    }

    @Test
    @DisplayName("같은 주소·이메일로 5번 틀리면 6번째 시도는 429로 막는다")
    void loginBlockedAfterTooManyFailures() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT, IP, EMAIL);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> limiter.checkLoginAllowed(IP, EMAIL));

        assertEquals(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS, e.getErrorCode());
    }

    @Test
    @DisplayName("이메일 대소문자와 앞뒤 공백이 달라도 같은 계정으로 센다")
    void loginEmailIsNormalized() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT, IP, "User@Example.com ");

        assertThrows(FlowSpaceException.class, () -> limiter.checkLoginAllowed(IP, EMAIL));
    }

    @Test
    @DisplayName("다른 이메일이나 다른 주소는 영향을 받지 않는다")
    void loginBlockIsPerAccountAndIp() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT, IP, EMAIL);

        assertDoesNotThrow(() -> limiter.checkLoginAllowed(IP, "other@example.com"));
        assertDoesNotThrow(() -> limiter.checkLoginAllowed("198.51.100.1", EMAIL));
    }

    @Test
    @DisplayName("15분이 지나면 다시 시도할 수 있다")
    void loginAllowedAfterWindow() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT, IP, EMAIL);

        now.addAndGet(AuthRateLimiter.LOGIN_WINDOW_MS + 1);

        assertDoesNotThrow(() -> limiter.checkLoginAllowed(IP, EMAIL));
    }

    @Test
    @DisplayName("로그인에 성공하면 그 계정의 실패 기록이 지워진다")
    void loginSuccessClearsFailures() {
        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT - 1, IP, EMAIL);
        limiter.clearLoginFailures(IP, EMAIL);

        failLogin(AuthRateLimiter.LOGIN_MAX_PER_ACCOUNT - 1, IP, EMAIL);

        assertDoesNotThrow(() -> limiter.checkLoginAllowed(IP, EMAIL));
    }

    @Test
    @DisplayName("한 주소에서 여러 이메일을 번갈아 틀려도 주소 전체 한도를 넘으면 막는다")
    void loginBlockedByIpLimit() {
        for (int i = 0; i < AuthRateLimiter.LOGIN_MAX_PER_IP; i++) {
            limiter.recordLoginFailure(IP, "user" + i + "@example.com");
        }

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> limiter.checkLoginAllowed(IP, "brand-new@example.com"));

        assertEquals(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS, e.getErrorCode());
    }

    @Test
    @DisplayName("같은 이메일로 1시간에 3번까지만 메일 요청을 받는다")
    void mailLimitedPerEmail() {
        for (int i = 0; i < AuthRateLimiter.MAIL_MAX_PER_EMAIL; i++) {
            limiter.checkMailAllowed("198.51.100." + i, EMAIL);
        }

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> limiter.checkMailAllowed("198.51.100.99", EMAIL));

        assertEquals(ErrorCode.TOO_MANY_MAIL_REQUESTS, e.getErrorCode());
    }

    @Test
    @DisplayName("같은 주소에서 1시간에 10번까지만 메일 요청을 받는다")
    void mailLimitedPerIp() {
        for (int i = 0; i < AuthRateLimiter.MAIL_MAX_PER_IP; i++) {
            limiter.checkMailAllowed(IP, "user" + i + "@example.com");
        }

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> limiter.checkMailAllowed(IP, "another@example.com"));

        assertEquals(ErrorCode.TOO_MANY_MAIL_REQUESTS, e.getErrorCode());
    }

    @Test
    @DisplayName("1시간이 지나면 메일 요청을 다시 받는다")
    void mailAllowedAfterWindow() {
        for (int i = 0; i < AuthRateLimiter.MAIL_MAX_PER_EMAIL; i++) {
            limiter.checkMailAllowed(IP, EMAIL);
        }

        now.addAndGet(AuthRateLimiter.MAIL_WINDOW_MS + 1);

        assertDoesNotThrow(() -> limiter.checkMailAllowed(IP, EMAIL));
    }

    @Test
    @DisplayName("한도에 걸려 막힌 요청은 횟수에 더 쌓이지 않는다")
    void blockedMailRequestIsNotCounted() {
        for (int i = 0; i < AuthRateLimiter.MAIL_MAX_PER_EMAIL; i++) {
            limiter.checkMailAllowed(IP, EMAIL);
        }
        assertThrows(FlowSpaceException.class, () -> limiter.checkMailAllowed(IP, EMAIL));

        // 첫 요청이 1시간 지나 빠지면 바로 다시 받을 수 있어야 해요(막힌 요청이 기록에 남아 있으면 안 돼요).
        now.addAndGet(AuthRateLimiter.MAIL_WINDOW_MS + 1);

        assertDoesNotThrow(() -> limiter.checkMailAllowed(IP, EMAIL));
    }
}
