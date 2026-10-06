package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.flowspace.entity.enums.Provider;

import jakarta.persistence.*;
import lombok.*;

// 계정에 연결된 소셜 로그인(Google · Microsoft). 한 계정에 여러 개 연결할 수 있어요.
// 소셜 계정 하나(provider + providerId)는 계정 하나에만 연결돼요.
@Entity
@Table(name = "user_social_accounts", uniqueConstraints = { @UniqueConstraint(columnNames = { "provider", "provider_id" }) })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UserSocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "social_account_id")
    private Long socialAccountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Provider provider;

    @Column(name = "provider_id", nullable = false, length = 255)
    private String providerId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
