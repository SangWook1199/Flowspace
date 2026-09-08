package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabaseRow;

// @formatter:off

// 데이터베이스 행 응답 DTO
public record BlockDatabaseRowResponse(

    Long rowId,
    Long databaseId,
    Integer position

) {

    public static BlockDatabaseRowResponse from(BlockDatabaseRow row) {
        return new BlockDatabaseRowResponse(
            row.getRowId(),
            row.getDatabase().getDatabaseId(),
            row.getPosition()
        );
    }

}

// @formatter:on