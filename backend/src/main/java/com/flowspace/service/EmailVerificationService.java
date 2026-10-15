package com.flowspace.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.auth.EmailResendRequest;
import com.flowspace.dto.auth.EmailVerifyRequest;
import com.flowspace.entity.EmailVerificationToken;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EmailVerificationTokenRepository;
import com.flowspace.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 회원가입 이메일 인증: 가입하면 인증 링크를 메일로 보내고, 링크를 누르면 그때부터 로그인할 수 있어요.
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EmailVerificationService {

    // 링크가 살아 있는 시간(시간)
    private static final int VALID_HOURS = 24;
    // 같은 계정으로 메일을 다시 보낼 수 있기까지 기다리는 시간(화면의 "다시 보내기" 대기 시간과 같아요)
    private static final Duration RESEND_INTERVAL = Duration.ofSeconds(30);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final MailService mailService;

    // 프런트 주소(메일 링크의 앞부분). 예: https://myflowspace.cloud
    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // 인증 메일 보내기(가입 직후, 다시 가입, "다시 보내기" 모두 이 길을 써요).
    // 방금 보냈으면 건너뛰어요 — 남의 이메일로 메일이 쏟아지게 하는 데 쓰이지 않게요.
    public void sendVerification(User user) {

        boolean tooSoon = tokenRepository.findTopByUserOrderByCreatedAtDesc(user)
            .map(last -> last.getCreatedAt().plus(RESEND_INTERVAL).isAfter(LocalDateTime.now())).orElse(false);

        if (tooSoon) {
            log.info("인증 메일을 방금 보내서 건너뛰었어요. email={}", user.getEmail());
            return;
        }

        // 이전에 보낸 링크는 더 쓸 수 없게 지우고 새로 만들어요.
        tokenRepository.deleteByUser(user);
        tokenRepository.flush();

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokenRepository.save(EmailVerificationToken.builder().user(user).tokenHash(hash(rawToken))
            .expiresAt(LocalDateTime.now().plusHours(VALID_HOURS)).build());

        String link = frontendUrl.replaceAll("/+$", "") + "/verify-email?token=" + rawToken;

        mailService.sendEmailVerification(user.getEmail(), link, VALID_HOURS);
    }

    // 인증 메일 다시 보내기
    // 가입 여부를 알아내는 데 쓰이지 않게, 없는 이메일이나 이미 인증한 계정이어도 똑같이 성공으로 답해요(아무것도 보내지 않을 뿐이에요).
    public void resend(EmailResendRequest request) {

        User user = userRepository.findByEmail(request.email().trim()).orElse(null);

        if (user == null || user.isWithdrawn() || user.isEmailVerified()) {
            log.info("인증 메일을 보내지 않았어요(가입된 이메일이 아니거나 이미 인증한 계정). email={}", request.email());
            return;
        }

        sendVerification(user);
    }

    // 인증하기: 링크가 맞고 만료 전이면 인증을 마치고, 링크는 지워요(한 번만 쓸 수 있어요).
    public void verify(EmailVerifyRequest request) {

        EmailVerificationToken saved = tokenRepository.findByTokenHash(hash(request.token().trim()))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_VERIFICATION_TOKEN));

        User user = saved.getUser();

        if (saved.isExpired() || user.isWithdrawn()) {
            throw new FlowSpaceException(ErrorCode.INVALID_VERIFICATION_TOKEN);
        }

        user.verifyEmail();

        tokenRepository.deleteByUser(user);
    }

    private static String hash(String rawToken) {

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
