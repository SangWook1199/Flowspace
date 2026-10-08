package com.flowspace.dto.task;

import com.flowspace.entity.WorkspaceTaskStatus;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;

// @formatter:off

public record TaskStatusResponse(

    Long statusId,
    String name,
    TaskStatusCategory category,
    WorkspaceColor color,
    Integer position,

    Boolean isDefault,
    Integer wipLimit

) {

    public static TaskStatusResponse from(WorkspaceTaskStatus mapping) {
        return new TaskStatusResponse(
            mapping.getTaskStatus().getStatusId(),
            mapping.getTaskStatus().getName(),
            mapping.getTaskStatus().getCategory(),
            mapping.getTaskStatus().getColor(),
            mapping.getPosition(),
            mapping.getIsDefault(),
            mapping.getWipLimit()
        );
    }

}

// @formatter:on