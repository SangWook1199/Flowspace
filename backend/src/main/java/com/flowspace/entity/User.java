package com.flowspace.entity;

import com.flowspace.entity.enums.Provider;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users", uniqueConstraints = { @UniqueConstraint(columnNames = { "provider", "provider_id" }) })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password", length = 255)
    private String password;

    @Column(name = "nickname", nullable = false, length = 30)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Provider provider = Provider.LOCAL;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    // 마지막으로 접속해 있던 시각 (WebSocket 연결이 열리거나 마지막 연결이 닫힐 때 PresenceService가 갱신해요)
    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_file_id")
    private File profileFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_workspace_id")
    private Workspace lastWorkspace;

    // 마지막 워크스페이스 변경
    public void updateLastWorkspace(Workspace workspace) {
        this.lastWorkspace = workspace;
    }

    // 프로필 이미지 수정
    public void updateProfileImage(File profileFile) {
        this.profileFile = profileFile;
    }

    // 프로필 수정
    public void updateProfile(String nickname, File profileFile) {
        this.nickname = nickname;
        this.profileFile = profileFile;
    }

    // 프로필 이미지 삭제
    public void removeProfileImage() {
        this.profileFile = null;
    }
}