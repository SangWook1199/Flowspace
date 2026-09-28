package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_database_column_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabaseColumnOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "option_id")
    private Long optionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "column_id", nullable = false)
    private BlockDatabaseColumn column;

    @Column(name = "value", nullable = false, length = 100)
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(name = "color", nullable = false, length = 20)
    @Builder.Default
    private WorkspaceColor color = WorkspaceColor.GRAY;

    // SELECT/MULTI_SELECT 옵션엔 없고, STATUS 옵션만 "할 일/진행 중/완료" 중
    // 어느 그룹에 속하는지를 가져요 — task_statuses.category와 같은 값을 쓰게
    // TaskStatusCategory를 그대로 재사용해요.
    @Enumerated(EnumType.STRING)
    @Column(name = "status_group", length = 20)
    private TaskStatusCategory statusGroup;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void update(String value, WorkspaceColor color, TaskStatusCategory statusGroup) {
        this.value = value;
        this.color = color;
        this.statusGroup = statusGroup;
    }

    public void updatePosition(Integer position) {
        this.position = position;
    }
}
