package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabaseRow;

// @formatter:off

// 데이터베이스 행 응답 DTO — 행 = 페이지라서 pageId를 같이 내려줘요. TITLE
// 컬럼의 제목은 이 페이지 쪽 title/icon을 그대로 쓰면 돼요.
public record BlockDatabaseRowResponse(

    Long rowId,
    Long databaseId,
    Long pageId,
    Integer position

) {

    public static BlockDatabaseRowResponse from(BlockDatabaseRow row) {
        return new BlockDatabaseRowResponse(
            row.getRowId(),
            row.getDatabase().getDatabaseId(),
            row.getPage() == null ? null : row.getPage().getPageId(),
            row.getPosition()
        );
    }

}

// @formatter:on