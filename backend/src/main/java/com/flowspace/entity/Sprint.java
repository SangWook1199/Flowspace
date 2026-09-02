package com.flowspace.entity;

import com.flowspace.entity.enums.SprintStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sprints")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Sprint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sprint_id")
    private Long sprintId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "goal", columnDefinition = "TEXT")
    private String goal;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "color", nullable = false, length = 7)
    @Builder.Default
    private String color = "#4F6EF7";

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private SprintStatus status = SprintStatus.PLANNING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}