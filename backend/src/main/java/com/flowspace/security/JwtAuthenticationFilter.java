package com.flowspace.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
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

                        if (jwtProvider.validateToken(token)) {

                                UserDetails userDetails = userDetailsService
                                                .loadUserByUsername(
                                                                jwtProvider.getEmail(token));

                                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                                userDetails,
                                                null,
                                                userDetails.getAuthorities());

                                authentication.setDetails(
                                                new WebAuthenticationDetailsSource().buildDetails(request));

                                SecurityContextHolder.getContext()
                                                .setAuthentication(authentication);
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
                                || path.startsWith("/swagger-ui/")
                                || path.startsWith("/v3/api-docs");
        }
}
