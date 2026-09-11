package com.flowspace.repository;

import com.flowspace.entity.Activity;
import com.flowspace.entity.Workspace;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    Page<Activity> findByWorkspaceOrderByCreatedAtDesc(Workspace workspace, Pageable pageable);

}