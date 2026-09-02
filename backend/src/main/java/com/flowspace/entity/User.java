package com.flowspace.entity;

import com.flowspace.entity.enums.Provider;
import com.flowspace.entity.enums.UserStatus;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "provider", "provider_id" })
})
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

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    @Column(name = "nickname", unique = true, length = 30)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Provider provider = Provider.LOCAL;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private UserStatus status = UserStatus.OFFLINE;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_file_id")
    private File profileFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_workspace_id")
    private Workspace lastWorkspace;
}