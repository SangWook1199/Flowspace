package com.flowspace.repository;

import com.flowspace.entity.Activity;
import com.flowspace.entity.Workspace;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.User;
import com.flowspace.entity.enums.ActivityType;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    Page<Activity> findByWorkspaceOrderByCreatedAtDesc(Workspace workspace, Pageable pageable);

    // 활동 기록 화면의 필터 (종류 / 한 사람 / 둘 다). 같은 시각이면 나중에 만든 게 먼저 나와요.
    @Query(value = "select a from Activity a where a.workspace = :workspace and a.type in :types "
        + "order by a.createdAt desc, a.activityId desc",
        countQuery = "select count(a) from Activity a where a.workspace = :workspace and a.type in :types")
    Page<Activity> findByTypes(@Param("workspace") Workspace workspace, @Param("types") java.util.Collection<ActivityType> types,
        Pageable pageable);

    @Query(value = "select a from Activity a where a.workspace = :workspace and a.user = :user "
        + "order by a.createdAt desc, a.activityId desc",
        countQuery = "select count(a) from Activity a where a.workspace = :workspace and a.user = :user")
    Page<Activity> findByUser(@Param("workspace") Workspace workspace, @Param("user") User user, Pageable pageable);

    @Query(value = "select a from Activity a where a.workspace = :workspace and a.user = :user and a.type in :types "
        + "order by a.createdAt desc, a.activityId desc",
        countQuery = "select count(a) from Activity a where a.workspace = :workspace and a.user = :user and a.type in :types")
    Page<Activity> findByUserAndTypes(@Param("workspace") Workspace workspace, @Param("user") User user,
        @Param("types") java.util.Collection<ActivityType> types, Pageable pageable);

}