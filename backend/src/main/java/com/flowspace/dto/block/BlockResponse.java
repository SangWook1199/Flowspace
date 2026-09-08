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