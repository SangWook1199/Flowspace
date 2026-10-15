package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.flowspace.dto.auth.EmailResendRequest;
import com.flowspace.dto.auth.EmailVerifyRequest;
import com.flowspace.entity.EmailVerificationToken;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EmailVerificationTokenRepository;
import com.flowspace.repository.UserRepository;

// 가입 이메일 인증: 메일 발송 규칙(원본 토큰은 저장하지 않음), 만료·재사용 거절, 성공 시 인증 처리를 확인해요.
@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository tokenRepository;

    @Mock
    private MailService mailService;

    @InjectMocks
    private EmailVerificationService service;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173/");
        user = User.builder().userId(1L).email("a@a.com").nickname("a").password("PW").emailVerified(false).build();
    }

    private static String sha256(String raw) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("메일 링크의 원본 토큰은 저장하지 않고 해시만 저장한다")
    void storesOnlyTheHash() throws Exception {
        when(tokenRepository.findTopByUserOrderByCreatedAtDesc(user)).thenReturn(Optional.empty());

        service.sendVerification(user);

        ArgumentCaptor<EmailVerificationToken> saved = ArgumentCaptor.forClass(EmailVerificationToken.class);
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);

        verify(tokenRepository).deleteByUser(user);
        verify(tokenRepository).save(saved.capture());
        verify(mailService).sendEmailVerification(eq("a@a.com"), link.capture(), anyInt());

        String prefix = "http://localhost:5173/verify-email?token=";
        assertTrue(link.getValue().startsWith(prefix));

        String rawToken = link.getValue().substring(prefix.length());

        assertEquals(sha256(rawToken), saved.getValue().getTokenHash());
        assertFalse(saved.getValue().getTokenHash().contains(rawToken));
        assertTrue(saved.getValue().getExpiresAt().isAfter(LocalDateTime.now()));
    }

    @Test
    @DisplayName("방금 보냈으면 다시 보내지 않는다")
    void tooSoonIsSkipped() {
        when(tokenRepository.findTopByUserOrderByCreatedAtDesc(user)).thenReturn(Optional.of(EmailVerificationToken
            .builder().user(user).tokenHash("x").expiresAt(LocalDateTime.now().plusHours(24)).createdAt(LocalDateTime.now()).build()));

        service.sendVerification(user);

        verifyNoInteractions(mailService);
        verify(tokenRepository, never()).save(any(EmailVerificationToken.class));
    }

    @Test
    @DisplayName("가입하지 않은 이메일이면 다시 보내기도 아무것도 보내지 않는다")
    void resendToUnknownEmailSendsNothing() {
        when(userRepository.findByEmail("none@a.com")).thenReturn(Optional.empty());

        service.resend(new EmailResendRequest("none@a.com"));

        verifyNoInteractions(tokenRepository);
        verifyNoInteractions(mailService);
    }

    @Test
    @DisplayName("이미 인증한 계정에는 다시 보내지 않는다")
    void resendToVerifiedAccountSendsNothing() {
        User verified = User.builder().userId(2L).email("v@a.com").nickname("v").password("PW").build();
        when(userRepository.findByEmail("v@a.com")).thenReturn(Optional.of(verified));

        service.resend(new EmailResendRequest("v@a.com"));

        verifyNoInteractions(mailService);
    }

    @Test
    @DisplayName("없는 토큰은 거절한다")
    void unknownTokenIsRejected() {
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.verify(new EmailVerifyRequest("nope")));

        assertEquals(ErrorCode.INVALID_VERIFICATION_TOKEN, e.getErrorCode());
    }

    @Test
    @DisplayName("만료된 토큰은 거절하고 인증하지 않는다")
    void expiredTokenIsRejected() throws Exception {
        when(tokenRepository.findByTokenHash(sha256("raw"))).thenReturn(Optional.of(EmailVerificationToken.builder()
            .user(user).tokenHash(sha256("raw")).expiresAt(LocalDateTime.now().minusMinutes(1)).build()));

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.verify(new EmailVerifyRequest("raw")));

        assertEquals(ErrorCode.INVALID_VERIFICATION_TOKEN, e.getErrorCode());
        assertFalse(user.isEmailVerified());
    }

    @Test
    @DisplayName("맞는 토큰이면 인증을 마치고 토큰을 지운다")
    void validTokenVerifiesTheUser() throws Exception {
        when(tokenRepository.findByTokenHash(sha256("raw"))).thenReturn(Optional.of(EmailVerificationToken.builder()
            .user(user).tokenHash(sha256("raw")).expiresAt(LocalDateTime.now().plusHours(1)).build()));

        service.verify(new EmailVerifyRequest("raw"));

        assertTrue(user.isEmailVerified());
        verify(tokenRepository).deleteByUser(user);
    }
}
