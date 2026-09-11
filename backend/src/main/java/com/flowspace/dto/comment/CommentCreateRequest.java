package com.flowspace.dto.comment;

import jakarta.validation.constraints.NotBlank;

// @formatter:off

// 댓글 작성 요청 DTO
public record CommentCreateRequest(

    Long parentCommentId,

    @NotBlank(message = "댓글 내용은 필수입니다.")
    String content

) {
}

// @formatter:on