package com.flowspace.entity;

import java.math.BigDecimal;

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

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "assignee_id")
    private Long assigneeId;

    @Column(name = "assignee_name", length = 50)
    private String assigneeName;

    @Column(name = "assignee_profile_file_id")
    private Long assigneeProfileFileId;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, precision = 20, scale = 10)
    private BigDecimal position;
}