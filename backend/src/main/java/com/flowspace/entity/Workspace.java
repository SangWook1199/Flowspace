package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import com.flowspace.entity.enums.WorkspaceColor;

@Entity
@Table(name = "workspaces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "workspace_id")
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "initials", nullable = false, length = 4)
    private String initials;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private WorkspaceColor color = WorkspaceColor.BLUE;

    // 워크스페이스 아이콘(이모지). 없으면 화면이 이니셜을 대신 보여줘요.
    @Column(name = "icon", length = 20)
    private String icon;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void changeOwner(User owner) {
        this.owner = owner;
    }

    // 이름·이니셜·색·아이콘 수정 (icon이 null이면 아이콘을 지워요)
    public void update(String name, String initials, WorkspaceColor color, String icon) {
        this.name = name;
        this.initials = initials;
        this.color = color;
        this.icon = icon;
    }
}