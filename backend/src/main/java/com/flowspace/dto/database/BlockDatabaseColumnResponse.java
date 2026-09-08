package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.enums.DatabaseColumnType;

// @formatter:off

// 데이터베이스 컬럼 응답 DTO
public record BlockDatabaseColumnResponse(

    Long columnId,
    Long databaseId,
    String name,
    DatabaseColumnType type,
    Integer position

) {

    public static BlockDatabaseColumnResponse from(BlockDatabaseColumn column) {
        return new BlockDatabaseColumnResponse(
            column.getColumnId(),
            column.getDatabase().getDatabaseId(),
            column.getName(),
            column.getType(),
            column.getPosition()
        );
    }

}

// @formatter:on