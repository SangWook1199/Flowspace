package com.flowspace.dto.page;

import com.flowspace.entity.Page;

import java.time.LocalDateTime;

// @formatter:off

// 페이지 응답 DTO
public record PageResponse(

    Long pageId,
    Long workspaceId,
    Long parentPageId,
    String title,
    String icon,
    Long createdBy,
    LocalDateTime createdAt,
    LocalDateTime updatedAt

) {

    public static PageResponse from(Page page) {
        return new PageResponse(
            page.getPageId(),
            page.getWorkspace().getWorkspaceId(),
            page.getParentPage() == null ? null : page.getParentPage().getPageId(),
            page.getTitle(),
            page.getIcon(),
            page.getCreatedBy().getUserId(),
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}

// @formatter:on