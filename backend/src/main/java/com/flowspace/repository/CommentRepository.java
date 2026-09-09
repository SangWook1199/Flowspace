package com.flowspace.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Comment;
import com.flowspace.entity.Task;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // Task 댓글 목록
    List<Comment> findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(Task task);

    // Block 댓글 목록
    List<Comment> findByBlockAndParentCommentIsNullOrderByCreatedAtAsc(Block block);

    // 대댓글 목록
    List<Comment> findByParentCommentOrderByCreatedAtAsc(Comment parentComment);

    Optional<Comment> findByCommentId(Long commentId);

}