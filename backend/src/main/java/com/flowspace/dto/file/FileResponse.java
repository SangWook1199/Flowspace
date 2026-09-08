package com.flowspace.dto.file;

import com.flowspace.entity.File;

// @formatter:off

// 파일 응답 DTO
public record FileResponse(

    Long fileId,
    String originalName,
    String fileUrl,
    String mimeType,
    Long size,
    Integer width,
    Integer height

) {

    public static FileResponse from(File file) {
        return new FileResponse(
            file.getFileId(),
            file.getOriginalName(),
            file.getFileUrl(),
            file.getMimeType(),
            file.getSize(),
            file.getWidth(),
            file.getHeight()
        );
    }

}

// @formatter:on