package com.flowspace.repository;

import com.flowspace.entity.Page;
import com.flowspace.entity.Workspace;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PageRepository extends JpaRepository<Page, Long> {

    List<Page> findByWorkspaceAndIsDeletedFalseOrderByCreatedAtDesc(Workspace workspace);

    List<Page> findByWorkspaceAndIsDeletedFalseOrderByPositionAscCreatedAtAsc(Workspace workspace);

    List<Page> findByWorkspaceAndIsDeletedTrueOrderByDeletedAtDesc(Workspace workspace);

    // 삭제 여부와 상관없이 하위 페이지 전체 (휴지통 복원/영구 삭제용)
    List<Page> findByParentPage(Page parentPage);

    Optional<Page> findByPageIdAndIsDeletedTrue(Long pageId);

    // 휴지통에 들어간 지 오래된 페이지 (30일 지나면 자동 영구 삭제용)
    List<Page> findByIsDeletedTrueAndDeletedAtBefore(LocalDateTime cutoff);

    long countByWorkspaceAndParentPageAndIsDeletedFalse(Workspace workspace, Page parentPage);

    long countByWorkspaceAndParentPageIsNullAndIsDeletedFalse(Workspace workspace);

    List<Page> findByParentPageAndIsDeletedFalse(Page parentPage);

    Optional<Page> findByPageIdAndIsDeletedFalse(Long pageId);

    // 블록 저장처럼 같은 페이지를 동시에 고치면 안 되는 작업에서, 페이지 행을 잠그고 읽어요(저장 순서를 한 줄로 세워요).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Page p where p.pageId = :pageId and p.isDeleted = false")
    Optional<Page> findActiveForUpdate(@Param("pageId") Long pageId);

}