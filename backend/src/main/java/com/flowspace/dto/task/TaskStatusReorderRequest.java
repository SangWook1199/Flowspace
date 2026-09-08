package com.flowspace.dto.task;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// @formatter:off

// Task 상태 순서 변경 요청 DTO
public record TaskStatusReorderRequest(

    @NotNull(message = "워크스페이스 ID는 필수입니다.")
    Long workspaceId,

    @Valid
    @NotEmpty(message = "상태 목록은 비어 있을 수 없습니다.")
    List<Item> statuses

) {

    public record Item(

        @NotNull(message = "상태 ID는 필수입니다.")
        Long statusId,

        @NotNull(message = "순서는 필수입니다.")
        Integer position

    ) {}

}

// @formatter:on