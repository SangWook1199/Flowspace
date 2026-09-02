package com.flowspace.repository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByBlockOrderByCreatedAtAsc(Block block);

    List<Comment> findByParentCommentOrderByCreatedAtAsc(Comment parentComment);
}