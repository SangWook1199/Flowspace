package com.flowspace.repository;

import com.flowspace.entity.Page;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

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

}