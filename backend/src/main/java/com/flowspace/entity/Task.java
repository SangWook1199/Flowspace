package com.flowspace.entity;

import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.entity.enums.TaskStatusCategory;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Task extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private Long taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private TaskStatus status;

    @Column(name = "position", nullable = false, precision = 20, scale = 10)
    @Builder.Default
    private BigDecimal position = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // 워크스페이스 안에서 1부터 올라가는 작업 번호예요(T-1, T-2 …). 스프린트를 옮겨도 그대로예요.
    @Column(name = "task_number", nullable = false)
    private Integer taskNumber;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 10)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    public void update(Sprint sprint, TaskStatus status, String title, String description, LocalDate startDate,
        LocalDate endDate, TaskPriority priority) {

        this.sprint = sprint;
        this.status = status;
        this.title = title;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.priority = priority;

        syncCompletedAt(status);
    }

    public void updateStatus(TaskStatus status) {
        this.status = status;

        syncCompletedAt(status);
    }

    // 기본 상태를 이 워크스페이스 전용 상태로 바꿔 끼울 때 쓴다.
    public void replaceStatus(TaskStatus newStatus) {
        this.status = newStatus;

        syncCompletedAt(newStatus);
    }

    // 완료 분류가 되면 그때 처음 완료 시각을 찍고, 이미 완료였던 작업은(제목만 고치거나 다른 완료 컬럼으로 옮겨도) 원래 시각을 그대로 둔다.
    // 완료가 아닌 분류로 가면 지운다.
    private void syncCompletedAt(TaskStatus status) {
        if (status.getCategory() != TaskStatusCategory.DONE) {
            this.completedAt = null;
            return;
        }

        if (this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }

    public void updateSprint(Sprint sprint) {
        this.sprint = sprint;
    }

    public void updatePosition(BigDecimal position) {
        this.position = position;
    }
}