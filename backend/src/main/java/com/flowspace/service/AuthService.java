package com.flowspace.service;

import com.flowspace.dto.auth.GoogleLoginRequest;
import com.flowspace.dto.auth.GoogleUserInfo;
import com.flowspace.dto.auth.LoginRequest;
import com.flowspace.dto.auth.LoginResponse;
import com.flowspace.dto.auth.MicrosoftLoginRequest;
import com.flowspace.dto.auth.MicrosoftUserInfo;
import com.flowspace.dto.auth.ProfileUpdateRequest;
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
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.save(
            RefreshToken.builder().user(user).token(refreshToken).expiredAt(LocalDateTime.now().plusDays(14)).build());

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
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.deleteByUser(user);

        RefreshToken token = RefreshToken.builder().user(user).token(refreshToken)
            .expiredAt(LocalDateTime.now().plusDays(14)).build();

        refreshTokenRepository.save(token);

        return LoginResponse.from(user, accessToken, refreshToken, user.getLastWorkspace().getWorkspaceId());
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

        RefreshToken token = RefreshToken.builder().user(user).token(refreshToken)
            .expiredAt(LocalDateTime.now().plusDays(14)).build();

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

        user.updateProfile(request.nickname(), profileFile);

        return UserResponse.from(user);
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
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.deleteByUser(user);

        refreshTokenRepository.save(
            RefreshToken.builder().user(user).token(refreshToken).expiredAt(LocalDateTime.now().plusDays(14)).build());

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
        String refreshToken = jwtProvider.createRefreshToken(user);

        refreshTokenRepository.deleteByUser(user);

        refreshTokenRepository.save(
            RefreshToken.builder().user(user).token(refreshToken).expiredAt(LocalDateTime.now().plusDays(14)).build());

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