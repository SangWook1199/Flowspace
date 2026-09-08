package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabase;

// @formatter:off

// 데이터베이스 응답 DTO
public record DatabaseResponse(

    Long databaseId,
    Long blockId,
    String name

) {

    public static DatabaseResponse from(BlockDatabase blockDatabase) {
        return new DatabaseResponse(
            blockDatabase.getDatabaseId(),
            blockDatabase.getBlock().getBlockId(),
            blockDatabase.getTitle()
        );
    }

}

// @formatter:on