package com.flowspace.dto.retrospective;

import java.math.BigDecimal;

import com.flowspace.entity.TaskSnapshot;

// @formatter:off

public record TaskSnapshotItem(

    Long snapshotId,
    Long snapshotStatusId,

    String title,

    Long assigneeId,
    String assigneeName,
    Long assigneeProfileFileId,

    String priority,
    BigDecimal position

) {

    public static TaskSnapshotItem from(TaskSnapshot snapshot) {
        return new TaskSnapshotItem(
            snapshot.getSnapshotId(),
            snapshot.getSnapshotStatus().getSnapshotStatusId(),
            snapshot.getTitle(),
            snapshot.getAssigneeId(),
            snapshot.getAssigneeName(),
            snapshot.getAssigneeProfileFileId(),
            snapshot.getPriority(),
            snapshot.getPosition()
        );
    }

}

// @formatter:on