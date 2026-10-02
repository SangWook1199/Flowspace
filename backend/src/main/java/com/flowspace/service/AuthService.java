package com.flowspace.service;

import com.flowspace.dto.auth.GoogleLoginRequest;
import com.flowspace.dto.auth.GoogleUserInfo;
import com.flowspace.dto.auth.LoginRequest;
import com.flowspace.dto.auth.LoginResponse;
import com.flowspace.dto.auth.MicrosoftLoginRequest;
import com.flowspace.dto.auth.MicrosoftUserInfo;
import com.flowspace.dto.auth.PasswordChangeRequest;
import com.flowspace.dto.auth.ProfileUpdateRequest;
import com.flowspace.dto.auth.RefreshRequest;
import com.flowspace.dto.auth.SignupRequest;
import com.flowspace.dto.auth.UserResponse;
import com.flowspace.dto.auth.TokenResponse;
import com.flowspace.dto.auth.TokenRequest;
import com.flowspace.entity.File;
import com.flowspace.entity.RefreshToken;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.Provider;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.security.JwtProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final WorkspaceService workspaceService;
    private final FileService fileService;

    // 로그인 상태를 유지하지 않을 때 리프레시 토큰이 살아 있는 시간
    private static final Duration SESSION_REFRESH_TTL = Duration.ofDays(1);

    @Value("${google.client-id}")
    private String googleClientId;
    @Value("${microsoft.client-id}")
    private String microsoftClientId;

    // 회원가입
    @Transactional
    public LoginResponse signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new FlowSpaceException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder().email(request.email()).password(passwordEncoder.encode(request.password()))
            .nickname(request.nickname()).provider(Provider.LOCAL).build();

        userRepository.save(user);

        // 개인 워크스페이스 자동 생성
        Workspace workspace = workspaceService.createPersonalWorkspace(user);

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, workspace.getWorkspaceId());
    }

    // 로그인 및 JWT 발급
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, request.remember());

        return LoginResponse.from(user, accessToken, refreshToken, user.getLastWorkspace().getWorkspaceId());
    }

    // 토큰 재발급 (로그인 때 저장해 둔 refresh token이 맞고 만료 전이면 새 access token을 발급해요)
    public LoginResponse refresh(RefreshRequest request) {

        String token = request.refreshToken();

        if (!jwtProvider.validateToken(token)) {
            throw new FlowSpaceException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        RefreshToken saved = refreshTokenRepository.findByToken(token)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (saved.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new FlowSpaceException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        User user = saved.getUser();

        // 동시에 여러 탭이 재발급을 요청해도 서로 끊기지 않도록 refresh token은 그대로 돌려줘요.
        String accessToken = jwtProvider.createAccessToken(user);

        Long workspaceId = user.getLastWorkspace() == null ? null : user.getLastWorkspace().getWorkspaceId();

        return LoginResponse.from(user, accessToken, token, workspaceId);
    }

    // Swagger OAuth2 로그인
    public TokenResponse loginForSwagger(TokenRequest request) {

        User user = userRepository.findByEmail(request.username())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return TokenResponse.of(accessToken, refreshToken);
    }

    // 로그인 사용자 정보 조회
    @Transactional(readOnly = true)
    public UserResponse getMe(String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        return UserResponse.from(user);
    }

    // 프로필 이미지 수정
    @Transactional
    public UserResponse updateProfileImage(MultipartFile image, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        File file = fileService.upload(image, user.getLastWorkspace(), email);

        user.updateProfileImage(file);

        return UserResponse.from(user);
    }

    // 프로필 수정
    public UserResponse updateProfile(ProfileUpdateRequest request, MultipartFile image, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        File profileFile = user.getProfileFile();

        if (image != null && !image.isEmpty()) {
            profileFile = fileService.upload(image, user.getLastWorkspace(), email);
        }

        // 한 줄 소개는 앞뒤 공백을 지우고, 비어 있으면 소개를 지운 것으로 봐요.
        String bio = request.bio() == null ? null : request.bio().trim();

        user.updateProfile(request.nickname().trim(), bio == null || bio.isEmpty() ? null : bio, profileFile);

        return UserResponse.from(user);
    }

    // 비밀번호 변경
    // 다른 기기의 로그인은 풀리고(리프레시 토큰을 새로 발급), 지금 쓰는 기기는 새 토큰을 받아 그대로 이어가요.
    public LoginResponse changePassword(PasswordChangeRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        // 구글·마이크로소프트 계정은 비밀번호가 없어요.
        if (user.getPassword() == null) {
            throw new FlowSpaceException(ErrorCode.PASSWORD_NOT_SET);
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new FlowSpaceException(ErrorCode.SAME_PASSWORD);
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));

        // 로그인 상태 유지 여부는 지금 로그인의 남은 기간을 그대로 이어받아요.
        Duration remaining = refreshTokenRepository.findByUser(user)
            .map(saved -> Duration.between(LocalDateTime.now(), saved.getExpiredAt())).filter(d -> !d.isNegative())
            .orElse(SESSION_REFRESH_TTL);

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, remaining);

        Long workspaceId = user.getLastWorkspace() == null ? null : user.getLastWorkspace().getWorkspaceId();

        return LoginResponse.from(user, accessToken, refreshToken, workspaceId);
    }

    // 리프레시 토큰 발급: 기존 토큰은 지우고 새로 저장해요(계정당 하나).
    // 로그인 상태 유지면 설정된 기간, 아니면 하루 동안 쓸 수 있어요.
    private String issueRefreshToken(User user, boolean remember) {

        Duration ttl = remember ? Duration.ofMillis(jwtProvider.getRefreshTokenExpiration()) : SESSION_REFRESH_TTL;

        return issueRefreshToken(user, ttl);
    }

    private String issueRefreshToken(User user, Duration ttl) {

        String refreshToken = jwtProvider.createRefreshToken(user, ttl.toMillis());

        refreshTokenRepository.deleteByUser(user);

        refreshTokenRepository.save(
            RefreshToken.builder().user(user).token(refreshToken).expiredAt(LocalDateTime.now().plus(ttl)).build());

        return refreshToken;
    }

    // 프로필 이미지 삭제
    public UserResponse deleteProfileImage(String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        if (user.getProfileFile() != null) {
            fileService.delete(user.getProfileFile());
            user.removeProfileImage();
        }

        return UserResponse.from(user);
    }

    // Google 로그인
    public LoginResponse googleLogin(GoogleLoginRequest request) {

        GoogleUserInfo googleUser = verifyGoogleToken(request.idToken());

        User user = userRepository.findByProviderAndProviderId(Provider.GOOGLE, googleUser.providerId())
            .orElseGet(() -> createGoogleUser(googleUser));

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, user.getLastWorkspace().getWorkspaceId());
    }

    // Google 회원 생성
    private User createGoogleUser(GoogleUserInfo googleUser) {

        User user = User.builder().email(googleUser.email()).password(null).nickname(googleUser.nickname())
            .provider(Provider.GOOGLE).providerId(googleUser.providerId()).build();

        userRepository.save(user);

        Workspace workspace = workspaceService.createPersonalWorkspace(user);

        if (googleUser.pictureUrl() != null) {
            uploadGoogleProfile(user, workspace, googleUser.pictureUrl());
        }

        return user;
    }

    // Google 프로필 저장
    private void uploadGoogleProfile(User user, Workspace workspace, String imageUrl) {

        try {

            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<byte[]> response = restTemplate.getForEntity(imageUrl, byte[].class);

            if (response.getBody() == null) {
                return;
            }

            File profile = fileService.uploadProfileImage(response.getBody(), workspace, user);

            user.updateProfileImage(profile);

        } catch (Exception ignored) {
        }
    }

    // Google ID Token 검증
    private GoogleUserInfo verifyGoogleToken(String idToken) {

        try {

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(),
                GsonFactory.getDefaultInstance()).setAudience(Collections.singletonList(googleClientId)).build();

            GoogleIdToken token = verifier.verify(idToken);

            if (token == null) {
                throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
            }

            GoogleIdToken.Payload payload = token.getPayload();

            return new GoogleUserInfo(payload.getSubject(), payload.getEmail(), (String) payload.get("name"),
                (String) payload.get("picture"));

        } catch (Exception e) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }
    }

    // Microsoft 로그인
    public LoginResponse microsoftLogin(MicrosoftLoginRequest request) {

        MicrosoftUserInfo microsoftUser = verifyMicrosoftToken(request.idToken());

        User user = userRepository.findByProviderAndProviderId(Provider.MICROSOFT, microsoftUser.providerId())
            .orElseGet(() -> createMicrosoftUser(microsoftUser, request.accessToken()));

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, user.getLastWorkspace().getWorkspaceId());
    }

    // Microsoft 회원 생성
    private User createMicrosoftUser(MicrosoftUserInfo microsoftUser, String accessToken) {

        User user = User.builder().email(microsoftUser.email()).password(null).nickname(microsoftUser.nickname())
            .provider(Provider.MICROSOFT).providerId(microsoftUser.providerId()).build();

        userRepository.save(user);

        Workspace workspace = workspaceService.createPersonalWorkspace(user);

        uploadMicrosoftProfile(user, workspace, accessToken);

        return user;
    }

    // Microsoft 프로필 저장
    private void uploadMicrosoftProfile(User user, Workspace workspace, String accessToken) {

        try {

            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<byte[]> response = restTemplate.exchange("https://graph.microsoft.com/v1.0/me/photo/$value",
                HttpMethod.GET, entity, byte[].class);

            if (response.getBody() == null) {
                return;
            }

            File profile = fileService.uploadProfileImage(response.getBody(), workspace, user);

            user.updateProfileImage(profile);

        } catch (Exception ignored) {
        }
    }

    // Microsoft ID Token 검증
    private MicrosoftUserInfo verifyMicrosoftToken(String idToken) {

        try {

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(),
                GsonFactory.getDefaultInstance()).setAudience(Collections.singletonList(microsoftClientId)).build();

            GoogleIdToken token = verifier.verify(idToken);

            if (token == null) {
                throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
            }

            GoogleIdToken.Payload payload = token.getPayload();

            return new MicrosoftUserInfo(payload.getSubject(), payload.getEmail(), (String) payload.get("name"));

        } catch (Exception e) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }
    }
}