package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subtask_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SubTaskSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subtask_snapshot_id")
    private Long subTaskSnapshotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private TaskSnapshot snapshot;

    @Column(name = "original_subtask_id")
    private Long originalSubtaskId;

    @Column(nullable = false, length = 300)
    private String content;

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted;

    @Column(name = "assignee_name", length = 50)
    private String assigneeName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_profile_file_id")
    private File assigneeProfileFile;

    @Column(nullable = false)
    private Integer position;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}