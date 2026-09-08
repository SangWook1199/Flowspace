package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabaseCell;

// @formatter:off

// 셀 응답 DTO
public record BlockDatabaseCellResponse(

    Long rowId,
    Long columnId,
    String value

) {

    public static BlockDatabaseCellResponse from(BlockDatabaseCell cell) {
        return new BlockDatabaseCellResponse(
            cell.getRow().getRowId(),
            cell.getColumn().getColumnId(),
            cell.getValue()
        );
    }

}

// @formatter:on