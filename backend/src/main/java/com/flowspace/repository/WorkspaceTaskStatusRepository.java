package com.flowspace.repository;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceTaskStatus;
import com.flowspace.entity.id.WorkspaceTaskStatusId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceTaskStatusRepository extends JpaRepository<WorkspaceTaskStatus, WorkspaceTaskStatusId> {

    List<WorkspaceTaskStatus> findByWorkspaceOrderByPositionAsc(Workspace workspace);

    long countByWorkspace(Workspace workspace);

}