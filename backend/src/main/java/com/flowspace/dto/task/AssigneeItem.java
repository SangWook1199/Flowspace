package com.flowspace.dto.task;

import com.flowspace.entity.TaskAssignee;

// @formatter:off

public record AssigneeItem(

    Long userId,
    String name,
    Long profileFileId

) {

    public static AssigneeItem from(TaskAssignee assignee) {
        return new AssigneeItem(
            assignee.getUser().getUserId(),
            assignee.getUser().getNickname(),
            assignee.getUser().getProfileFile() == null
                ? null
                : assignee.getUser().getProfileFile().getFileId()
        );
    }

}

// @formatter:on