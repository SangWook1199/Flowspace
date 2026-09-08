package com.flowspace.dto.task;

import java.math.BigDecimal;
import java.util.List;

// @formatter:off

public record TaskReorderRequest(

    List<Item> tasks

) {

    public record Item(

        Long taskId,

        BigDecimal position,

        Long statusId

    ) {}
}

// @formatter:on