package com.flowspace.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

        private final JwtProvider jwtProvider;
        private final CustomUserDetailsService userDetailsService;

        @Override
        protected void doFilterInternal(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        FilterChain filterChain) throws ServletException, IOException {

                String bearerToken = request.getHeader("Authorization");

                if (bearerToken != null && bearerToken.startsWith("Bearer ")) {

                        String token = bearerToken.substring(7);

                        // access token만 인증으로 인정해요(refresh token은 재발급 전용이라 여기선 무시해요).
                        if (jwtProvider.isAccessToken(token)) {

                                try {

                                        UserDetails userDetails = userDetailsService
                                                        .loadUserByUsername(
                                                                        jwtProvider.getEmail(token));

                                        // 탈퇴한 계정의 토큰은 만료 전이어도 인증하지 않아요.
                                        if (userDetails.isEnabled()) {

                                                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                                                userDetails,
                                                                null,
                                                                userDetails.getAuthorities());

                                                authentication.setDetails(
                                                                new WebAuthenticationDetailsSource().buildDetails(request));

                                                SecurityContextHolder.getContext()
                                                                .setAuthentication(authentication);
                                        }

                                } catch (UsernameNotFoundException e) {
                                        // 계정이 없으면 인증 없이 넘겨요(401이 돼요). 필터에서 예외를 던지면 500이 돼요.
                                }
                        }
                }

                filterChain.doFilter(request, response);
        }

        // JWT 검사를 제외할 경로
        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {

                String path = request.getServletPath();

                return path.equals("/api/auth/login")
                                || path.equals("/api/auth/signup")
                                || path.equals("/api/auth/refresh")
                                || path.equals("/api/auth/google")
                                || path.equals("/api/auth/microsoft")
                                || path.startsWith("/swagger-ui/")
                                || path.startsWith("/v3/api-docs");
        }
}
