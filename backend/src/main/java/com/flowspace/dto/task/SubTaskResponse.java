package com.flowspace.dto.task;

import com.flowspace.entity.SubTask;

// @formatter:off

public record SubTaskResponse(

    Long subtaskId,

    Long taskId,

    String content,

    Boolean isCompleted,

    Integer position

) {

    public static SubTaskResponse from(SubTask subTask) {
        return new SubTaskResponse(
            subTask.getSubtaskId(),
            subTask.getTask().getTaskId(),
            subTask.getContent(),
            subTask.getIsCompleted(),
            subTask.getPosition()
        );
    }
}

// @formatter:on