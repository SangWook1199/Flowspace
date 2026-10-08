package com.flowspace.dto.task;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

public record TaskReorderRequest(

    @Valid
    @NotEmpty(message = "작업 목록은 비어 있을 수 없습니다.")
    @Size(max = 1000, message = "한 번에 1000개까지만 바꿀 수 있습니다.")
    List<Item> tasks

) {

    public record Item(

        @NotNull(message = "작업 ID는 필수입니다.")
        Long taskId,

        @NotNull(message = "순서는 필수입니다.")
        BigDecimal position,

        @NotNull(message = "상태 ID는 필수입니다.")
        Long statusId

    ) {}
}

// @formatter:on