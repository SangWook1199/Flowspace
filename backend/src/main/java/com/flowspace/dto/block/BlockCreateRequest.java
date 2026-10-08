package com.flowspace.dto.block;

import com.flowspace.entity.enums.BlockType;
import jakarta.validation.constraints.Size;

// @formatter:off

// 블록 생성 요청 DTO
public record BlockCreateRequest(

    Long parentBlockId,

    BlockType type,

    @Size(max = 500000, message = "블록 내용이 너무 큽니다.")
    String content,

    Long taskId,

    Long eventId,

    Long sprintId

) {
}

// @formatter:on