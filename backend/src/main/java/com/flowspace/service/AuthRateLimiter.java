package com.flowspace.service;

import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

import org.springframework.stereotype.Component;

import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 로그인 무차별 대입과 메일 남발을 막는 횟수 제한이에요.
// 서버 메모리에서 "최근 N분 동안 몇 번 했는지"를 세요(서버를 다시 켜면 처음부터 다시 세요).
// 서버가 한 대뿐이라 이 정도로 충분하고, 여러 대로 늘리면 Redis 같은 공용 저장소로 옮겨야 해요.
@Component
public class AuthRateLimiter {

    // 로그인: 같은 접속 주소 + 같은 이메일로 15분 안에 5번 틀리면 잠깐 막아요.
    static final int LOGIN_MAX_PER_ACCOUNT = 5;
    // 같은 접속 주소에서 15분 안에 50번 틀리면(여러 이메일을 번갈아 시도하는 경우) 막아요.
    static final int LOGIN_MAX_PER_IP = 50;
    static final long LOGIN_WINDOW_MS = 15 * 60 * 1000L;

    // 메일을 보내는 요청(가입·인증 메일 재전송·비밀번호 찾기): 1시간에 접속 주소당 10번, 이메일당 3번.
    static final int MAIL_MAX_PER_IP = 10;
    static final int MAIL_MAX_PER_EMAIL = 3;
    static final long MAIL_WINDOW_MS = 60 * 60 * 1000L;

    // 가장 긴 기간(1시간)이 지난 기록은 어느 규칙에도 필요 없어서 지워요.
    private static final long KEEP_MS = MAIL_WINDOW_MS;
    private static final int CLEANUP_SIZE = 10_000;

    // 키별 "요청한 시각(ms)" 목록
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final LongSupplier clock;

    public AuthRateLimiter() {
        this(System::currentTimeMillis);
    }

    // 테스트에서 시간을 직접 움직일 수 있게 열어 둔 생성자예요.
    AuthRateLimiter(LongSupplier clock) {
        this.clock = clock;
    }

    // 로그인 시도 전에 호출해요. 이미 너무 많이 틀렸으면 예외로 막아요.
    public void checkLoginAllowed(String ip, String email) {
        if (count(loginKey(ip, email), LOGIN_WINDOW_MS) >= LOGIN_MAX_PER_ACCOUNT
            || count(loginIpKey(ip), LOGIN_WINDOW_MS) >= LOGIN_MAX_PER_IP) {
            throw new FlowSpaceException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
        }
    }

    // 비밀번호가 틀렸을 때 호출해요.
    public void recordLoginFailure(String ip, String email) {
        add(loginKey(ip, email));
        add(loginIpKey(ip));
        cleanupIfLarge();
    }

    // 로그인에 성공하면 그 계정의 실패 기록을 지워요.
    public void clearLoginFailures(String ip, String email) {
        hits.remove(loginKey(ip, email));
    }

    // 메일을 보내기 전에 호출해요. 한도를 넘었으면 예외로 막고, 아니면 이번 요청을 기록해요.
    // (가입 여부와 상관없이 요청 횟수만 세서, 이 응답으로 가입된 이메일인지 알아낼 수는 없어요.)
    public void checkMailAllowed(String ip, String email) {
        String ipKey = "mail-ip:" + normalize(ip);
        String emailKey = "mail-email:" + normalize(email);

        if (count(ipKey, MAIL_WINDOW_MS) >= MAIL_MAX_PER_IP
            || count(emailKey, MAIL_WINDOW_MS) >= MAIL_MAX_PER_EMAIL) {
            throw new FlowSpaceException(ErrorCode.TOO_MANY_MAIL_REQUESTS);
        }

        add(ipKey);
        add(emailKey);
        cleanupIfLarge();
    }

    // 기간이 지난 기록을 지우고 남은 횟수를 돌려줘요.
    private int count(String key, long windowMs) {
        long limit = clock.getAsLong() - windowMs;
        int[] size = {0};

        hits.computeIfPresent(key, (k, times) -> {
            while (!times.isEmpty() && times.peekFirst() <= limit) {
                times.pollFirst();
            }
            size[0] = times.size();
            return times.isEmpty() ? null : times;
        });

        return size[0];
    }

    private void add(String key) {
        long now = clock.getAsLong();

        hits.compute(key, (k, times) -> {
            Deque<Long> list = times == null ? new ConcurrentLinkedDeque<>() : times;
            list.addLast(now);
            return list;
        });
    }

    // 기록이 너무 많이 쌓이면(서로 다른 주소·이메일이 아주 많을 때) 오래된 기록을 한꺼번에 지워요.
    private void cleanupIfLarge() {
        if (hits.size() < CLEANUP_SIZE) {
            return;
        }

        long limit = clock.getAsLong() - KEEP_MS;
        hits.entrySet().removeIf(e -> {
            Long last = e.getValue().peekLast();
            return last == null || last <= limit;
        });
    }

    private String loginKey(String ip, String email) {
        return "login:" + normalize(ip) + "|" + normalize(email);
    }

    private String loginIpKey(String ip) {
        return "login-ip:" + normalize(ip);
    }

    // 대소문자·앞뒤 공백이 달라도 같은 값으로 세요.
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
