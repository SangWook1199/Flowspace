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
    LocalDateTime deletedAt,

    // 스프린트 회고에 연결된 페이지인지 (회고 페이지는 스프린트마다 자동으로 생겨서 화면이 따로 묶어 보여줘요)
    boolean retrospective

) {

    public static PageResponse from(Page page, boolean retrospective) {
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
            page.getDeletedAt(),
            retrospective
        );
    }
}

// @formatter:on