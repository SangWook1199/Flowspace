package com.flowspace.dto.task;

import jakarta.validation.constraints.NotNull;

import java.util.List;

// @formatter:off

public record SubTaskReorderRequest(

    List<Item> subtasks

) {

    public record Item(

        @NotNull
        Long subtaskId,

        @NotNull
        Integer position

    ) {}
}

// @formatter:on