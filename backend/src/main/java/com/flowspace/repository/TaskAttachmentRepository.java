package com.flowspace.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.File;
import com.flowspace.entity.Page;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAttachment;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {

    // 목록에 필요한 페이지·파일·올린 사람을 한 번에 읽어요
    @EntityGraph(attributePaths = { "page", "file", "createdBy" })
    List<TaskAttachment> findByTaskOrderByAttachmentIdAsc(Task task);

    long countByTask(Task task);

    boolean existsByTaskAndPage(Task task, Page page);

    Optional<TaskAttachment> findByAttachmentIdAndTask(Long attachmentId, Task task);

    // 작업을 지우기 전에 이 작업에 올라온 파일만 읽어요. 첨부(TaskAttachment) 자체를 읽어 두면 안 돼요 —
    // 지워진 작업을 가리키는 첨부가 남아 flush 오류(TransientPropertyValueException)가 나요(첨부 행은 DB가 같이 지워요).
    @Query("select a.file from TaskAttachment a where a.task = :task and a.file is not null")
    List<File> findFilesByTask(@Param("task") Task task);
}
