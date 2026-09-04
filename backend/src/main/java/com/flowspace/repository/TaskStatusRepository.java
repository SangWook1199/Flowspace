package com.flowspace.repository;

import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskStatusRepository extends JpaRepository<TaskStatus, Long> {

    List<TaskStatus> findByWorkspaceOrderByPositionAsc(Workspace workspace);
}