package com.flowspace.dto.task;

import jakarta.validation.constraints.NotNull;

// 관련 문서로 연결할 페이지
public record TaskAttachmentPageRequest(@NotNull Long pageId) {
}
