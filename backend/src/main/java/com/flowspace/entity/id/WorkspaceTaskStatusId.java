package com.flowspace.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class WorkspaceTaskStatusId implements Serializable {

    @Column(name = "workspace_id")
    private Long workspaceId;

    @Column(name = "status_id")
    private Long statusId;

}