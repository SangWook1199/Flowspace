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

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    // 한 컬럼에 동시에 둘 수 있는 작업 수의 권장 상한(WIP 제한). 비어 있으면 제한 없음. 넘어도 막지는 않고 화면에서 표시만 한다.
    @Column(name = "wip_limit")
    private Integer wipLimit;

    public void updatePosition(Integer position) {
        this.position = position;
    }

    public void updateWipLimit(Integer wipLimit) {
        this.wipLimit = wipLimit;
    }
}