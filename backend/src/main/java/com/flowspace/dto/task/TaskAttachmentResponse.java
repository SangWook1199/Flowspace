package com.flowspace.dto.task;

import java.time.LocalDateTime;

import com.flowspace.entity.TaskAttachment;

// @formatter:off

// 작업 관련 문서 응답 DTO — type이 PAGE면 page* 값이, FILE이면 file* 값이 채워져요.
public record TaskAttachmentResponse(

    Long attachmentId,
    String type,
    Long pageId,
    String pageTitle,
    String pageIcon,
    Long fileId,
    String fileName,
    String fileUrl,
    Long fileSize,
    String mimeType,
    String createdByName,
    LocalDateTime createdAt

) {

    public static TaskAttachmentResponse from(TaskAttachment attachment) {

        boolean isPage = attachment.isPage();

        return new TaskAttachmentResponse(
            attachment.getAttachmentId(),
            isPage ? "PAGE" : "FILE",
            isPage ? attachment.getPage().getPageId() : null,
            isPage ? attachment.getPage().getTitle() : null,
            isPage ? attachment.getPage().getIcon() : null,
            isPage ? null : attachment.getFile().getFileId(),
            isPage ? null : attachment.getFile().getOriginalName(),
            isPage ? null : attachment.getFile().getFileUrl(),
            isPage ? null : attachment.getFile().getSize(),
            isPage ? null : attachment.getFile().getMimeType(),
            attachment.getCreatedBy().getNickname(),
            attachment.getCreatedAt()
        );
    }
}
