package com.flowspace.dto.block;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.flowspace.entity.Block;
import com.flowspace.entity.enums.BlockType;

// @formatter:off

// 블록 응답 DTO
public record BlockResponse(

    Long blockId,
    Long pageId,

    Long taskId,
    Long eventId,
    Long databaseId,
    String imageUrl,

    Long parentBlockId,
    BlockType type,
    BigDecimal position,
    String content,
    Long createdBy,
    LocalDateTime createdAt,
    LocalDateTime updatedAt

) {

    public static BlockResponse from(Block block) {
        return new BlockResponse(
            block.getBlockId(),
            block.getPage().getPageId(),

            block.getTask() == null ? null : block.getTask().getTaskId(),
            block.getEvent() == null ? null : block.getEvent().getEventId(),
            block.getDatabase() == null ? null : block.getDatabase().getDatabaseId(),
            block.getImageFile() == null ? null : block.getImageFile().getFileUrl(),

            block.getParentBlock() == null ? null : block.getParentBlock().getBlockId(),
            block.getType(),
            block.getPosition(),
            block.getContent(),
            block.getCreatedBy().getUserId(),
            block.getCreatedAt(),
            block.getUpdatedAt()
        );
    }

}

// @formatter:on