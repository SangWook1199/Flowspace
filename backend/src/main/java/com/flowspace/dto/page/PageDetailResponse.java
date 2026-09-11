package com.flowspace.dto.page;

import java.math.BigDecimal;
import java.util.List;

import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.entity.Block;
import com.flowspace.entity.Page;

// @formatter:off

public record PageDetailResponse(

    Long pageId,
    String title,
    String icon,
    String coverUrl,
    List<BlockItem> blocks,
    List<ChildPageItem> childPages

) {

    public record BlockItem(

        Long blockId,
        String type,
        BigDecimal position,
        String content,
        Long taskId,
        Long eventId,
        Long databaseId,
        String imageUrl,
        Long parentBlockId,
        List<CommentResponse> comments

    ) {

        public static BlockItem from(
            Block block,
            List<CommentResponse> comments
        ) {
            return new BlockItem(
                block.getBlockId(),
                block.getType().name(),
                block.getPosition(),
                block.getContent(),
                block.getTask() == null ? null : block.getTask().getTaskId(),
                block.getEvent() == null ? null : block.getEvent().getEventId(),
                block.getDatabase() == null ? null : block.getDatabase().getDatabaseId(),
                block.getImageFile() == null ? null : block.getImageFile().getFileUrl(),
                block.getParentBlock() == null ? null : block.getParentBlock().getBlockId(),
                comments
            );
        }

    }

    public record ChildPageItem(

        Long pageId,
        String title,
        String icon

    ) {

        public static ChildPageItem from(Page page) {
            return new ChildPageItem(
                page.getPageId(),
                page.getTitle(),
                page.getIcon()
            );
        }

    }

    public static PageDetailResponse from(
        Page page,
        List<BlockItem> blockItems,
        List<Page> childPages
    ) {

        return new PageDetailResponse(
            page.getPageId(),
            page.getTitle(),
            page.getIcon(),
            page.getCoverFile() == null ? null : page.getCoverFile().getFileUrl(),
            blockItems,
            childPages.stream().map(ChildPageItem::from).toList()
        );
    }

}

// @formatter:on