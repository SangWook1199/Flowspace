package com.flowspace.dto.block;

import java.util.List;

import com.flowspace.entity.enums.BlockType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// @formatter:off

// 블록 일괄 동기화 요청 DTO (목록 순서가 곧 블록 순서)
public record BlockSyncRequest(

    // 내가 마지막으로 받아온 페이지 버전 (비우면 충돌 검사를 하지 않아요)
    Long baseVersion,

    @Valid
    @NotNull(message = "블록 목록은 필수입니다.")
    @Size(max = 5000, message = "한 페이지에 블록은 5000개까지만 둘 수 있습니다.")
    List<BlockSyncItem> blocks

) {

    public record BlockSyncItem(

        @NotBlank(message = "clientId는 필수입니다.")
        @Size(max = 100, message = "clientId가 너무 깁니다.")
        String clientId,

        Long blockId,

        @Size(max = 100, message = "parentClientId가 너무 깁니다.")
        String parentClientId,

        BlockType type,

        @Size(max = 500000, message = "블록 내용이 너무 큽니다.")
        String content,

        Long taskId,

        Long eventId,

        Long sprintId

    ) {
    }

}

// @formatter:on
