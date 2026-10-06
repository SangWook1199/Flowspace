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
import com.flowspace.dto.auth.SocialLinkRequest;
import com.flowspace.dto.auth.UserResponse;
import com.flowspace.dto.auth.TokenResponse;
import com.flowspace.dto.auth.TokenRequest;
import com.flowspace.entity.File;
import com.flowspace.entity.RefreshToken;
import com.flowspace.entity.User;
import com.flowspace.entity.UserSocialAccount;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.Provider;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.RefreshTokenRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.UserSocialAccountRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.security.JwtProvider;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

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
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
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

    private static final String MICROSOFT_JWK_SET_URI = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
    private static final String MICROSOFT_ISSUER_PREFIX = "https://login.microsoftonline.com/";

    private volatile JwtDecoder microsoftJwtDecoder;

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

        return LoginResponse.from(user, accessToken, refreshToken, workspaceIdOf(user));
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

        File file = fileService.upload(image, profileWorkspace(user), email);

        user.updateProfileImage(file);

        return UserResponse.from(user);
    }

    // 프로필 수정
    public UserResponse updateProfile(ProfileUpdateRequest request, MultipartFile image, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        File profileFile = user.getProfileFile();

        if (image != null && !image.isEmpty()) {
            profileFile = fileService.upload(image, profileWorkspace(user), email);
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

    // 로그인 응답에 실을 "마지막으로 보던 워크스페이스 id". 그 워크스페이스가 삭제됐거나 비어 있으면 null이에요(화면이 알아서 첫 워크스페이스를 골라요).
    private Long workspaceIdOf(User user) {

        return user.getLastWorkspace() == null ? null : user.getLastWorkspace().getWorkspaceId();
    }

    // 프로필 이미지를 저장할 워크스페이스: 마지막으로 보던 곳, 없으면 참여 중인 첫 워크스페이스예요(파일은 워크스페이스에 속해야 해요).
    private Workspace profileWorkspace(User user) {

        if (user.getLastWorkspace() != null) {
            return user.getLastWorkspace();
        }

        return workspaceMemberRepository.findByUser(user).stream().map(WorkspaceMember::getWorkspace).findFirst()
            .orElse(null);
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


    // 소셜 계정으로 로그인할 사용자를 찾아요. 연결된 소셜 계정을 먼저 보고, 없으면 예전 방식(users.provider)으로 가입한 계정을 봐요.
    private Optional<User> findSocialUser(Provider provider, String providerId) {

        return socialAccountRepository.findByProviderAndProviderId(provider, providerId).map(UserSocialAccount::getUser)
            .or(() -> userRepository.findByProviderAndProviderId(provider, providerId));
    }

    // 소셜 계정을 사용자에게 연결해요.
    private void linkSocial(User user, Provider provider, String providerId) {

        socialAccountRepository
            .save(UserSocialAccount.builder().user(user).provider(provider).providerId(providerId).build());
    }

    // 같은 이메일의 계정이 이미 있을 때 새 계정을 만들지 못하게 막아요.
    //  - 비밀번호가 있는 계정(이메일 가입): 그 비밀번호로 본인임을 확인하면 연결할 수 있다고 알려요(SOCIAL_LINK_REQUIRED).
    //    이메일만 보고 합치면 남의 계정을 가로챌 수 있어서, 꼭 비밀번호로 확인해요.
    //  - 그 밖(다른 소셜로 가입한 계정 등): 처음 가입한 방식으로 로그인하게 안내해요(SOCIAL_EMAIL_CONFLICT).
    private void rejectExistingEmail(String email, Provider provider) {

        User existing = userRepository.findByEmail(email).orElse(null);

        if (existing == null) {
            return;
        }

        if (existing.getPassword() != null && !existing.isWithdrawn()
            && !socialAccountRepository.existsByUserAndProvider(existing, provider)) {
            throw new FlowSpaceException(ErrorCode.SOCIAL_LINK_REQUIRED);
        }

        throw new FlowSpaceException(ErrorCode.SOCIAL_EMAIL_CONFLICT);
    }

    // 소셜 계정 연결: 같은 이메일의 기존 계정(비밀번호가 있는 계정)에 소셜 계정을 연결하고 로그인해요.
    // 소셜 토큰이 그 이메일의 주인임을, 비밀번호가 기존 계정의 주인임을 각각 증명해요.
    public LoginResponse linkSocialAccount(SocialLinkRequest request) {

        Provider provider = request.provider();
        String providerId;
        String email;

        if (provider == Provider.GOOGLE) {
            GoogleUserInfo info = verifyGoogleToken(request.idToken());
            providerId = info.providerId();
            email = info.email();
        } else if (provider == Provider.MICROSOFT) {
            MicrosoftUserInfo info = verifyMicrosoftToken(request.idToken());
            providerId = info.providerId();
            email = info.email();
        } else {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }

        User user = findSocialUser(provider, providerId).orElse(null);

        // 이미 연결된 소셜 계정이면 그대로 로그인해요.
        if (user == null) {

            User existing = userRepository.findByEmail(email)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_LOGIN));

            if (existing.isWithdrawn() || existing.getPassword() == null
                || socialAccountRepository.existsByUserAndProvider(existing, provider)) {
                throw new FlowSpaceException(ErrorCode.SOCIAL_EMAIL_CONFLICT);
            }

            if (!passwordEncoder.matches(request.password(), existing.getPassword())) {
                throw new FlowSpaceException(ErrorCode.SOCIAL_LINK_PASSWORD_MISMATCH);
            }

            linkSocial(existing, provider, providerId);
            user = existing;
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, workspaceIdOf(user));
    }

    // Google 로그인
    public LoginResponse googleLogin(GoogleLoginRequest request) {

        GoogleUserInfo googleUser = verifyGoogleToken(request.idToken());

        User user = findSocialUser(Provider.GOOGLE, googleUser.providerId())
            .orElseGet(() -> createGoogleUser(googleUser));

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, workspaceIdOf(user));
    }

    // Google 회원 생성
    private User createGoogleUser(GoogleUserInfo googleUser) {

        // 같은 이메일로 이미 가입한 계정이 있으면 새로 만들지 않아요(연결 확인 또는 안내).
        rejectExistingEmail(googleUser.email(), Provider.GOOGLE);

        User user = User.builder().email(googleUser.email()).password(null).nickname(googleUser.nickname())
            .provider(Provider.GOOGLE).providerId(googleUser.providerId()).build();

        userRepository.save(user);
        linkSocial(user, Provider.GOOGLE, googleUser.providerId());

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

            // Google이 이메일을 확인한 계정만 받아요(확인되지 않은 이메일을 믿으면 남의 이메일로 계정을 만들 수 있어요).
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new FlowSpaceException(ErrorCode.SOCIAL_EMAIL_NOT_VERIFIED);
            }

            return new GoogleUserInfo(payload.getSubject(), payload.getEmail(), (String) payload.get("name"),
                (String) payload.get("picture"));

        } catch (FlowSpaceException e) {
            throw e;
        } catch (Exception e) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }
    }

    // Microsoft 로그인
    public LoginResponse microsoftLogin(MicrosoftLoginRequest request) {

        MicrosoftUserInfo microsoftUser = verifyMicrosoftToken(request.idToken());

        User user = findSocialUser(Provider.MICROSOFT, microsoftUser.providerId())
            .orElseGet(() -> createMicrosoftUser(microsoftUser, request.accessToken()));

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = issueRefreshToken(user, true);

        return LoginResponse.from(user, accessToken, refreshToken, workspaceIdOf(user));
    }

    // Microsoft 회원 생성
    private User createMicrosoftUser(MicrosoftUserInfo microsoftUser, String accessToken) {

        // 같은 이메일로 이미 가입한 계정이 있으면 새로 만들지 않아요(연결 확인 또는 안내).
        rejectExistingEmail(microsoftUser.email(), Provider.MICROSOFT);

        User user = User.builder().email(microsoftUser.email()).password(null).nickname(microsoftUser.nickname())
            .provider(Provider.MICROSOFT).providerId(microsoftUser.providerId()).build();

        userRepository.save(user);
        linkSocial(user, Provider.MICROSOFT, microsoftUser.providerId());

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
    //  - Google용 검증기로는 Microsoft 토큰을 확인할 수 없어서(발급처·서명 키가 달라요), Microsoft가 공개한 서명 키로 직접 확인해요.
    //  - 서명·만료는 디코더가 확인하고, 이 앱(client-id)용으로 발급됐는지와 Microsoft가 발급했는지는 아래에서 확인해요.
    private MicrosoftUserInfo verifyMicrosoftToken(String idToken) {

        try {

            Jwt jwt = microsoftDecoder().decode(idToken);

            List<String> audience = jwt.getAudience();
            String issuer = jwt.getClaimAsString("iss");

            if (audience == null || !audience.contains(microsoftClientId) || issuer == null
                || !issuer.startsWith(MICROSOFT_ISSUER_PREFIX) || !issuer.endsWith("/v2.0")) {
                throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
            }

            // 개인 계정은 email 클레임이 없을 수 있어서 preferred_username(로그인 이름)으로 대신해요.
            String email = jwt.getClaimAsString("email");

            if (email == null || email.isBlank()) {
                email = jwt.getClaimAsString("preferred_username");
            }

            if (email == null || email.isBlank() || !email.contains("@")) {
                throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
            }

            String name = jwt.getClaimAsString("name");

            if (name == null || name.isBlank()) {
                name = email.substring(0, email.indexOf('@'));
            }

            return new MicrosoftUserInfo(jwt.getSubject(), email, name);

        } catch (FlowSpaceException e) {
            throw e;
        } catch (Exception e) {
            throw new FlowSpaceException(ErrorCode.INVALID_LOGIN);
        }
    }

    // Microsoft이 공개한 서명 키(JWKS)로 ID Token을 확인하는 디코더 — 처음 쓸 때 한 번만 만들어요(키는 알아서 캐시돼요).
    private JwtDecoder microsoftDecoder() {

        JwtDecoder decoder = microsoftJwtDecoder;

        if (decoder == null) {
            decoder = NimbusJwtDecoder.withJwkSetUri(MICROSOFT_JWK_SET_URI).build();
            microsoftJwtDecoder = decoder;
        }

        return decoder;
    }
}
