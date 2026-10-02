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

    public static final String WITHDRAWN_NICKNAME = "탈퇴한 사용자";

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

    // 한 줄 소개 (선택)
    @Column(name = "bio", length = 100)
    private String bio;

    // 탈퇴한 시각 (탈퇴하지 않았으면 null). 작업·댓글 같은 기록은 남겨야 해서 행을 지우지 않고 익명 처리해요.
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

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
    public void updateProfile(String nickname, String bio, File profileFile) {
        this.nickname = nickname;
        this.bio = bio;
        this.profileFile = profileFile;
    }

    // 탈퇴 처리: 개인정보를 지우고 "탈퇴한 사용자"로 바꿔요.
    // 이메일은 유일해야 해서 사용자 id가 들어간 값으로 바꿔 두면, 같은 이메일로 다시 가입할 수 있어요.
    public void withdraw() {
        this.email = "withdrawn-" + this.userId + "@deleted.flowspace";
        this.nickname = WITHDRAWN_NICKNAME;
        this.password = null;
        this.providerId = null;
        this.bio = null;
        this.profileFile = null;
        this.lastWorkspace = null;
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isWithdrawn() {
        return deletedAt != null;
    }

    // 비밀번호 변경 (암호화된 값을 받아요)
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    // 프로필 이미지 삭제
    public void removeProfileImage() {
        this.profileFile = null;
    }
}