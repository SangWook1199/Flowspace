package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.enums.DatabaseViewType;

// @formatter:off

// 데이터베이스 응답 DTO
public record DatabaseResponse(

    Long databaseId,
    Long blockId,
    String name,
    DatabaseViewType viewType

) {

    public static DatabaseResponse from(BlockDatabase blockDatabase) {
        return new DatabaseResponse(
            blockDatabase.getDatabaseId(),
            blockDatabase.getBlock().getBlockId(),
            blockDatabase.getTitle(),
            blockDatabase.getViewType()
        );
    }

}

// @formatter:on