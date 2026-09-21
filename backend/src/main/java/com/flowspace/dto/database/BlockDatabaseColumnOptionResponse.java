package com.flowspace.dto.database;

import com.flowspace.entity.BlockDatabaseColumnOption;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;

// @formatter:off

// 컬럼 옵션(선택/다중 선택/상태 값) 응답 DTO
public record BlockDatabaseColumnOptionResponse(

    Long optionId,
    Long columnId,
    String value,
    WorkspaceColor color,
    TaskStatusCategory statusGroup,
    Integer position

) {

    public static BlockDatabaseColumnOptionResponse from(BlockDatabaseColumnOption option) {
        return new BlockDatabaseColumnOptionResponse(
            option.getOptionId(),
            option.getColumn().getColumnId(),
            option.getValue(),
            option.getColor(),
            option.getStatusGroup(),
            option.getPosition()
        );
    }

}

// @formatter:on
