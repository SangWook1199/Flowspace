package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.flowspace.dto.auth.PasswordForgotRequest;
import com.flowspace.dto.auth.PasswordResetRequest;
import com.flowspace.entity.PasswordResetToken;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.PasswordResetTokenRepository;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserRepository;

// 비밀번호 재설정: 메일 발송 규칙(원본 토큰은 저장하지 않음), 만료·재사용·같은 비밀번호 거절, 성공 시 정리를 확인해요.
@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @InjectMocks
    private PasswordResetService service;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173/");
        user = User.builder().userId(1L).email("a@a.com").nickname("a").password("OLD").build();
    }

    private static String sha256(String raw) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("가입하지 않은 이메일이면 아무것도 보내지 않는다")
    void unknownEmailSendsNothing() {
        when(userRepository.findByEmail("none@a.com")).thenReturn(Optional.empty());

        service.requestReset(new PasswordForgotRequest("none@a.com"));

        verifyNoInteractions(tokenRepository);
        verifyNoInteractions(mailService);
    }

    @Test
    @DisplayName("비밀번호가 없는 소셜 전용 계정에는 보내지 않는다")
    void socialOnlyAccountSendsNothing() {
        User social = User.builder().userId(2L).email("s@a.com").nickname("s").build();
        when(userRepository.findByEmail("s@a.com")).thenReturn(Optional.of(social));

        service.requestReset(new PasswordForgotRequest("s@a.com"));

        verifyNoInteractions(mailService);
    }

    @Test
    @DisplayName("방금 보냈으면 다시 보내지 않는다")
    void tooSoonIsSkipped() {
        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findTopByUserOrderByCreatedAtDesc(user)).thenReturn(
            Optional.of(PasswordResetToken.builder().user(user).tokenHash("x").expiresAt(LocalDateTime.now().plusMinutes(30))
                .createdAt(LocalDateTime.now()).build()));

        service.requestReset(new PasswordForgotRequest("a@a.com"));

        verifyNoInteractions(mailService);
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
    }

    @Test
    @DisplayName("메일 링크의 원본 토큰은 저장하지 않고 해시만 저장한다")
    void storesOnlyTheHash() throws Exception {
        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findTopByUserOrderByCreatedAtDesc(user)).thenReturn(Optional.empty());

        service.requestReset(new PasswordForgotRequest("a@a.com"));

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);

        verify(tokenRepository).deleteByUser(user);
        verify(tokenRepository).save(saved.capture());
        verify(mailService).sendPasswordReset(eq("a@a.com"), link.capture(), anyInt());

        String prefix = "http://localhost:5173/reset-password?token=";
        assertTrue(link.getValue().startsWith(prefix));

        String rawToken = link.getValue().substring(prefix.length());

        assertEquals(64, saved.getValue().getTokenHash().length());
        assertFalse(saved.getValue().getTokenHash().contains(rawToken));
        assertEquals(sha256(rawToken), saved.getValue().getTokenHash());
        assertTrue(saved.getValue().getExpiresAt().isAfter(LocalDateTime.now()));
    }

    @Test
    @DisplayName("없는 토큰은 거절한다")
    void unknownTokenIsRejected() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.reset(new PasswordResetRequest("nope", "newPassword1")));

        assertEquals(ErrorCode.INVALID_RESET_TOKEN, e.getErrorCode());
    }

    @Test
    @DisplayName("만료된 토큰은 지우고 거절한다")
    void expiredTokenIsRejectedAndDeleted() {
        PasswordResetToken expired = PasswordResetToken.builder().user(user).tokenHash("h")
            .expiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.reset(new PasswordResetRequest("raw", "newPassword1")));

        assertEquals(ErrorCode.INVALID_RESET_TOKEN, e.getErrorCode());
        verify(tokenRepository).delete(expired);
        verify(refreshTokenRepository, never()).deleteByUser(any(User.class));
    }

    @Test
    @DisplayName("지금 비밀번호와 같으면 거절하고 링크는 남겨둔다")
    void samePasswordIsRejected() {
        PasswordResetToken valid = PasswordResetToken.builder().user(user).tokenHash("h")
            .expiresAt(LocalDateTime.now().plusMinutes(10)).build();
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(valid));
        when(passwordEncoder.matches("newPassword1", "OLD")).thenReturn(true);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.reset(new PasswordResetRequest("raw", "newPassword1")));

        assertEquals(ErrorCode.SAME_PASSWORD, e.getErrorCode());
        verify(tokenRepository, never()).deleteByUser(any(User.class));
        assertEquals("OLD", user.getPassword());
    }

    @Test
    @DisplayName("성공하면 비밀번호를 바꾸고 재설정 링크와 모든 로그인을 지운다")
    void successChangesPasswordAndClearsSessions() {
        PasswordResetToken valid = PasswordResetToken.builder().user(user).tokenHash("h")
            .expiresAt(LocalDateTime.now().plusMinutes(10)).build();
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(valid));
        when(passwordEncoder.matches("newPassword1", "OLD")).thenReturn(false);
        when(passwordEncoder.encode("newPassword1")).thenReturn("ENCODED");

        service.reset(new PasswordResetRequest("raw", "newPassword1"));

        assertEquals("ENCODED", user.getPassword());
        verify(tokenRepository).deleteByUser(user);
        verify(refreshTokenRepository).deleteByUser(user);
    }
}
