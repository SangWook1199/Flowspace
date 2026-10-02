package com.flowspace.dto.block;

import java.util.List;

import com.flowspace.entity.enums.BlockType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// @formatter:off

// 블록 일괄 동기화 요청 DTO (목록 순서가 곧 블록 순서)
public record BlockSyncRequest(

    @Valid
    @NotNull(message = "블록 목록은 필수입니다.")
    List<BlockSyncItem> blocks

) {

    public record BlockSyncItem(

        @NotBlank(message = "clientId는 필수입니다.")
        String clientId,

        Long blockId,

        String parentClientId,

        BlockType type,

        String content,

        Long taskId,

        Long eventId,

        Long sprintId

    ) {
    }

}

// @formatter:on
