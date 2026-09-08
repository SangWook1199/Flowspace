package com.flowspace.dto.block;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

// @formatter:off

// 블록 순서 변경 요청 DTO
public record BlockReorderRequest(

    @Valid
    @NotEmpty(message = "블록 목록은 비어 있을 수 없습니다.")
    List<BlockOrderItem> blocks

) {
}

// @formatter:on