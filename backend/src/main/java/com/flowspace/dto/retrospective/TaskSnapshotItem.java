package com.flowspace.dto.retrospective;

import java.math.BigDecimal;
import java.util.List;

import com.flowspace.dto.task.AssigneeItem;
import com.flowspace.entity.SubTaskSnapshot;
import com.flowspace.entity.TaskSnapshot;
import com.flowspace.entity.TaskSnapshotAssignee;

// @formatter:off

public record TaskSnapshotItem(

    Long snapshotId,
    Long snapshotStatusId,

    String title,

    List<AssigneeItem> assignees,
    List<SubTaskSnapshotItem> subtasks,

    String priority,
    BigDecimal position

) {

    public static TaskSnapshotItem from(
        TaskSnapshot snapshot,
        List<TaskSnapshotAssignee> assignees,
        List<SubTaskSnapshot> subtasks
    ) {
        return new TaskSnapshotItem(
            snapshot.getSnapshotId(),
            snapshot.getSnapshotStatus().getSnapshotStatusId(),
            snapshot.getTitle(),
            assignees.stream()
                .map(assignee -> new AssigneeItem(
                    assignee.getOriginalUserId(),
                    assignee.getNickname(),
                    assignee.getProfileFile() == null
                        ? null
                        : assignee.getProfileFile().getFileId()
                ))
                .toList(),
            subtasks.stream()
                .map(SubTaskSnapshotItem::from)
                .toList(),
            snapshot.getPriority(),
            snapshot.getPosition()
        );
    }

}

// @formatter:on