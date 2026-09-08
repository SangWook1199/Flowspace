package com.flowspace.dto.database;

import java.util.List;

import com.flowspace.entity.enums.DatabaseViewType;

// @formatter:off

public record DatabaseDetailResponse(

    Long databaseId,
    String title,
    DatabaseViewType viewType,
    List<BlockDatabaseColumnResponse> columns,
    List<RowData> rows

) {

    public record RowData(
        Long rowId,
        Integer position,
        List<CellData> cells
    ) {}

    public record CellData(
        Long columnId,
        String value
    ) {}

}

// @formatter:on