package com.flowspace.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Comment;
import com.flowspace.entity.Task;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // Task 댓글 목록
    List<Comment> findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(Task task);

    // 여러 Task의 댓글을 한 번에 읽어요(작성자·프로필 이미지까지 함께)
    @EntityGraph(attributePaths = { "user", "user.profileFile", "task" })
    List<Comment> findByTaskInAndParentCommentIsNullOrderByCreatedAtAsc(Collection<Task> tasks);

    // 여러 블록의 댓글을 한 번에 읽어요(작성자·프로필 이미지까지 함께)
    @EntityGraph(attributePaths = { "user", "user.profileFile", "block" })
    List<Comment> findByBlockInAndParentCommentIsNullOrderByCreatedAtAsc(Collection<Block> blocks);

    // 여러 댓글의 대댓글을 한 번에 읽어요
    @EntityGraph(attributePaths = { "user", "user.profileFile", "parentComment" })
    List<Comment> findByParentCommentInOrderByCreatedAtAsc(Collection<Comment> parentComments);

    // Block 댓글 목록
    List<Comment> findByBlockAndParentCommentIsNullOrderByCreatedAtAsc(Block block);

    // 대댓글 목록
    List<Comment> findByParentCommentOrderByCreatedAtAsc(Comment parentComment);

    Optional<Comment> findByCommentId(Long commentId);

}