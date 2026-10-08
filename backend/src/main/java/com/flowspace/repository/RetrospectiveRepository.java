package com.flowspace.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.Page;
import com.flowspace.entity.Retrospective;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Workspace;

public interface RetrospectiveRepository extends JpaRepository<Retrospective, Long> {

    Optional<Retrospective> findBySprint(Sprint sprint);

    boolean existsBySprint(Sprint sprint);

    boolean existsByPage(Page page);

    // 워크스페이스의 회고 페이지 id 전체 (페이지 목록에 "회고 페이지 여부"를 한 번에 붙일 때 써요)
    @Query("select r.page.pageId from Retrospective r where r.sprint.workspace = :workspace")
    List<Long> findPageIdsByWorkspace(@Param("workspace") Workspace workspace);

}