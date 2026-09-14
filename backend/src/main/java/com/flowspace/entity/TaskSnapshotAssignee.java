package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "task_snapshot_assignees")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TaskSnapshotAssignee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "snapshot_assignee_id")
    private Long snapshotAssigneeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private TaskSnapshot snapshot;

    @Column(name = "original_user_id")
    private Long originalUserId;

    @Column(name = "nickname", nullable = false, length = 30)
    private String nickname;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_file_id")
    private File profileFile;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}