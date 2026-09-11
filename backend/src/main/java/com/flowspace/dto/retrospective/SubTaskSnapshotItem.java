package com.flowspace.dto.retrospective;

import com.flowspace.entity.SubTaskSnapshot;

// @formatter:off

public record SubTaskSnapshotItem(

    Long subTaskSnapshotId,

    String content,

    Boolean isCompleted,

    String assigneeName,

    Long assigneeProfileFileId,

    Integer position

) {

    public static SubTaskSnapshotItem from(SubTaskSnapshot subtask) {
        return new SubTaskSnapshotItem(
            subtask.getSubTaskSnapshotId(),
            subtask.getContent(),
            subtask.getIsCompleted(),
            subtask.getAssigneeName(),
            subtask.getAssigneeProfileFile() == null
                ? null
                : subtask.getAssigneeProfileFile().getFileId(),
            subtask.getPosition()
        );
    }

}

// @formatter:on