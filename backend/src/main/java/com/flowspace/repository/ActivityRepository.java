package com.flowspace.repository;

import com.flowspace.entity.Activity;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findTop20ByWorkspaceOrderByCreatedAtDesc(
            Workspace workspace);
}