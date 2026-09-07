package com.flowspace.repository;

import com.flowspace.entity.Page;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PageRepository extends JpaRepository<Page, Long> {

    List<Page> findByWorkspaceAndIsDeletedFalseOrderByCreatedAtDesc(Workspace workspace);

    List<Page> findByParentPageAndIsDeletedFalse(Page parentPage);

    Optional<Page> findByPageIdAndIsDeletedFalse(Long pageId);

}