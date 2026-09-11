package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "retrospective_status_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RetrospectiveStatusSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "snapshot_status_id")
    private Long snapshotStatusId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retrospective_id", nullable = false)
    private Retrospective retrospective;

    @Column(name = "original_status_id")
    private Long originalStatusId;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(nullable = false)
    private Integer position;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}