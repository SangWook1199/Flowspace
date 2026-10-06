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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.auth.PasswordForgotRequest;
import com.flowspace.dto.auth.PasswordResetRequest;
import com.flowspace.entity.PasswordResetToken;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.PasswordResetTokenRepository;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 비밀번호 찾기: 메일로 재설정 링크를 보내고, 링크의 토큰으로 새 비밀번호를 정해요.
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PasswordResetService {

    // 링크가 살아 있는 시간(분)
    private static final int VALID_MINUTES = 30;
    // 같은 계정으로 메일을 다시 보낼 수 있기까지 기다리는 시간(화면의 "다시 보내기" 대기 시간과 같아요)
    private static final Duration RESEND_INTERVAL = Duration.ofSeconds(10);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    // 프런트 주소(메일 링크의 앞부분). 예: http://localhost:5173
    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // 재설정 메일 보내기
    // 가입 여부를 알아내는 데 쓰이지 않게, 없는 이메일이어도 똑같이 성공으로 답해요(아무것도 보내지 않을 뿐이에요).
    // 비밀번호가 없는 계정(소셜 로그인 전용)은 재설정할 비밀번호가 없어서 보내지 않아요.
    public void requestReset(PasswordForgotRequest request) {

        User user = userRepository.findByEmail(request.email().trim()).orElse(null);

        // 화면에는 이유를 알리지 않지만(가입 여부 노출 방지), 개발할 때 원인을 찾을 수 있게 서버 로그에는 남겨요.
        if (user == null || user.isWithdrawn() || user.getPassword() == null) {
            log.info("비밀번호 재설정 메일을 보내지 않았어요(가입된 이메일이 아니거나 비밀번호가 없는 소셜 전용 계정). email={}", request.email());
            return;
        }

        // 연달아 눌러 메일이 쏟아지지 않게, 방금 보냈으면 건너뛰어요.
        boolean tooSoon = tokenRepository.findTopByUserOrderByCreatedAtDesc(user)
            .map(last -> last.getCreatedAt().plus(RESEND_INTERVAL).isAfter(LocalDateTime.now())).orElse(false);

        if (tooSoon) {
            log.info("비밀번호 재설정 메일을 방금 보내서 건너뛰었어요. email={}", user.getEmail());
            return;
        }

        // 이전에 보낸 링크는 더 쓸 수 없게 지우고 새로 만들어요.
        tokenRepository.deleteByUser(user);
        tokenRepository.flush();

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokenRepository.save(PasswordResetToken.builder().user(user).tokenHash(hash(rawToken))
            .expiresAt(LocalDateTime.now().plusMinutes(VALID_MINUTES)).build());

        String link = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;

        mailService.sendPasswordReset(user.getEmail(), link, VALID_MINUTES);
    }

    // 새 비밀번호 정하기: 링크가 맞고 만료 전이면 비밀번호를 바꾸고, 링크는 지워요(한 번만 쓸 수 있어요).
    // 모든 기기의 로그인도 풀어요(비밀번호를 잃어버린 상황이라 남이 로그인해 있을 수도 있어서요).
    public void reset(PasswordResetRequest request) {

        PasswordResetToken saved = tokenRepository.findByTokenHash(hash(request.token().trim()))
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_RESET_TOKEN));

        User user = saved.getUser();

        if (saved.isExpired() || user.isWithdrawn()) {
            tokenRepository.delete(saved);
            throw new FlowSpaceException(ErrorCode.INVALID_RESET_TOKEN);
        }

        // 지금 쓰는 비밀번호와 같으면 막아요(비밀번호 변경과 같은 규칙). 링크는 그대로 남겨서 다른 비밀번호로 다시 시도할 수 있어요.
        if (user.getPassword() != null && passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.SAME_PASSWORD);
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));

        tokenRepository.deleteByUser(user);
        refreshTokenRepository.deleteByUser(user);
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
