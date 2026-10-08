package com.flowspace.dto.task;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// @formatter:off

public record SubTaskReorderRequest(

    @Valid
    @NotEmpty(message = "하위 작업 목록은 비어 있을 수 없습니다.")
    @Size(max = 200, message = "한 번에 200개까지만 바꿀 수 있습니다.")
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