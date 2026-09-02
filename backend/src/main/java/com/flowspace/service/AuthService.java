package com.flowspace.service;

import com.flowspace.dto.auth.LoginRequest;
import com.flowspace.dto.auth.LoginResponse;
import com.flowspace.dto.auth.SignupRequest;
import com.flowspace.dto.auth.UserResponse;
import com.flowspace.dto.auth.TokenResponse;
import com.flowspace.dto.auth.TokenRequest;
import com.flowspace.entity.RefreshToken;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.Provider;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    // 회원가입
    public void signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new FlowSpaceException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        if (userRepository.existsByNickname(request.nickname())) {
            throw new FlowSpaceException(ErrorCode.NICKNAME_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .nickname(request.nickname())
                .provider(Provider.LOCAL)
                .build();

        userRepository.save(user);
    }

    // 로그인 및 JWT 발급
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.deleteByUser(user);

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiredAt(LocalDateTime.now().plusDays(14))
                .build();

        refreshTokenRepository.save(token);

        return LoginResponse.from(user, accessToken, refreshToken);
    }

    // Swagger OAuth2 로그인
    public TokenResponse loginForSwagger(TokenRequest request) {

        User user = userRepository.findByEmail(request.username())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.deleteByUser(user);

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiredAt(LocalDateTime.now().plusDays(14))
                .build();

        refreshTokenRepository.save(token);

        return TokenResponse.of(accessToken, refreshToken);
    }

    // 로그인 사용자 정보 조회
    @Transactional(readOnly = true)
    public UserResponse getMe(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        return UserResponse.from(user);
    }
}