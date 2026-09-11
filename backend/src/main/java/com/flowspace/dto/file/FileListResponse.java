package com.flowspace.dto.file;

import java.util.List;

// @formatter:off

// 파일 목록 응답 DTO
public record FileListResponse(

    List<FileResponse> files

) { }

// @formatter:on