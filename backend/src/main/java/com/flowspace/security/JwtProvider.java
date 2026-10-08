package com.flowspace.security;

import com.flowspace.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtProvider {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(User user) {
        Date now = new Date();

        return Jwts.builder()
                .subject(String.valueOf(user.getUserId()))
                .claim("email", user.getEmail())
                .claim("provider", user.getProvider().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    public String createRefreshToken(User user) {
        return createRefreshToken(user, refreshTokenExpiration);
    }

    // 유효 기간(ms)을 직접 정해서 만들어요 (로그인 상태 유지 여부에 따라 길이가 달라져요)
    public String createRefreshToken(User user, long ttlMillis) {
        Date now = new Date();

        return Jwts.builder()
                .subject(String.valueOf(user.getUserId()))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMillis))
                .signWith(secretKey)
                .compact();
    }

    // 설정(jwt.refresh-token-expiration)에 있는 기본 유효 기간(ms)
    public long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 요청 인증에 쓰는 access token인지 확인해요. access token에는 email 클레임이 있고 refresh token에는 없어서,
    // 재발급 전용 refresh token으로는 일반 API·WebSocket에 들어올 수 없게 해요.
    public boolean isAccessToken(String token) {
        try {
            return validateToken(token) && getEmail(token) != null;
        } catch (Exception e) {
            return false;
        }
    }

    // 재발급(/api/auth/refresh)에 쓰는 refresh token인지 확인해요(email 클레임이 없는 서명된 토큰).
    public boolean isRefreshToken(String token) {
        try {
            return validateToken(token) && getEmail(token) == null;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Long.valueOf(claims.getSubject());
    }

    public String getEmail(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("email", String.class);
    }
}