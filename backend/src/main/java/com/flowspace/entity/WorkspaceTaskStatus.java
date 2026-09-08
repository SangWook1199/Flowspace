package com.flowspace.entity;

import com.flowspace.entity.id.WorkspaceTaskStatusId;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workspace_task_statuses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class WorkspaceTaskStatus {

    @EmbeddedId
    private WorkspaceTaskStatusId id;

    @MapsId("workspaceId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @MapsId("statusId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private TaskStatus taskStatus;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    public void updatePosition(Integer position) {
        this.position = position;
    }
}