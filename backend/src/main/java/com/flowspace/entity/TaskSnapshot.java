package com.flowspace.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "task_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TaskSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "snapshot_id")
    private Long snapshotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retrospective_id", nullable = false)
    private Retrospective retrospective;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_status_id", nullable = false)
    private RetrospectiveStatusSnapshot snapshotStatus;

    @Column(name = "original_task_id")
    private Long originalTaskId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "priority", nullable = false, length = 20)
    private String priority;

    @Column(name = "position", nullable = false, precision = 20, scale = 10)
    private BigDecimal position;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}