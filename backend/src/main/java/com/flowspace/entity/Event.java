package com.flowspace.entity;

import com.flowspace.entity.enums.WorkspaceColor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Event extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "color", nullable = false)
    @Builder.Default
    private WorkspaceColor color = WorkspaceColor.PURPLE;

    @Column(name = "start_datetime", nullable = false)
    private LocalDateTime startDatetime;

    @Column(name = "end_datetime", nullable = true)
    private LocalDateTime endDatetime;

    public void update(String title, String description, WorkspaceColor color, LocalDateTime startDatetime,
        LocalDateTime endDatetime) {
        this.title = title;
        this.description = description;
        this.color = color;
        this.startDatetime = startDatetime;
        this.endDatetime = endDatetime;
    }
}