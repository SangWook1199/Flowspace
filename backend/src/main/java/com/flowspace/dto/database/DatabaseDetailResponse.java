package com.flowspace.dto.database;

import java.util.List;

// @formatter:off

public record DatabaseDetailResponse(

    Long databaseId,
    String title,
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