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
    String coverUrl,
    Integer position,
    Long createdBy,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime deletedAt

) {

    public static PageResponse from(Page page) {
        return new PageResponse(
            page.getPageId(),
            page.getWorkspace().getWorkspaceId(),
            page.getParentPage() == null ? null : page.getParentPage().getPageId(),
            page.getTitle(),
            page.getIcon(),
            page.getCoverFile() == null ? null : page.getCoverFile().getFileUrl(),
            page.getPosition(),
            page.getCreatedBy().getUserId(),
            page.getCreatedAt(),
            page.getUpdatedAt(),
            page.getDeletedAt()
        );
    }
}

// @formatter:on