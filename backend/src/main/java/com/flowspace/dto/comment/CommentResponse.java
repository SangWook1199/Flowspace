package com.flowspace.dto.comment;

import java.time.LocalDateTime;
import java.util.List;

import com.flowspace.entity.Comment;

// @formatter:off

// 댓글 응답 DTO
public record CommentResponse(

    Long commentId,
    Long parentCommentId,
    Long userId,
    String userName,
    Long profileFileId,
    String content,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    List<CommentResponse> replies

) {

    public static CommentResponse from(
        Comment comment,
        List<CommentResponse> replies
    ) {
        return new CommentResponse(
            comment.getCommentId(),
            comment.getParentComment() == null ? null : comment.getParentComment().getCommentId(),
            comment.getUser().getUserId(),
            comment.getUser().getName(),
            comment.getUser().getProfileFile() == null
                ? null
                : comment.getUser().getProfileFile().getFileId(),
            comment.getContent(),
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            replies
        );
    }

}

// @formatter:on