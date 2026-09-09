package com.flowspace.dto.comment;

import jakarta.validation.constraints.NotBlank;

// @formatter:off

// 댓글 수정 요청 DTO
public record CommentUpdateRequest(

    @NotBlank(message = "댓글 내용은 필수입니다.")
    String content

) {
}

// @formatter:on