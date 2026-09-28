package com.flowspace.dto.database;

import java.util.List;

import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.enums.DatabaseColumnType;

// @formatter:off

// 데이터베이스 컬럼 응답 DTO
public record BlockDatabaseColumnResponse(

    Long columnId,
    Long databaseId,
    String name,
    DatabaseColumnType type,
    Integer position,
    Integer width,
    List<BlockDatabaseColumnOptionResponse> options

) {

    // SELECT/MULTI_SELECT/STATUS가 아닌 컬럼은 옵션이 없어서, 매번 options를
    // 조회해서 넘겨주는 쪽(BlockDatabaseService)에서 빈 리스트를 넘겨요.
    public static BlockDatabaseColumnResponse from(BlockDatabaseColumn column,
        List<BlockDatabaseColumnOptionResponse> options) {
        return new BlockDatabaseColumnResponse(
            column.getColumnId(),
            column.getDatabase().getDatabaseId(),
            column.getName(),
            column.getType(),
            column.getPosition(),
            column.getWidth(),
            options
        );
    }

}

// @formatter:on