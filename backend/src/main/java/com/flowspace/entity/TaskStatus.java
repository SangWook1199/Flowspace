package com.flowspace.entity;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_statuses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class TaskStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    private Long statusId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private TaskStatusCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "color", nullable = false, length = 20)
    private WorkspaceColor color;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void update(String name, TaskStatusCategory category, WorkspaceColor color) {
        this.name = name;
        this.category = category;
        this.color = color;
    }

    public void updatePosition(Integer position) {
        this.position = position;
    }
}