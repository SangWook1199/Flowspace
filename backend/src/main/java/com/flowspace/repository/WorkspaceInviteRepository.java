package com.flowspace.repository;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.enums.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceInviteRepository
                extends JpaRepository<WorkspaceInvite, Long> {

        List<WorkspaceInvite> findByEmailAndStatus(
                        String email,
                        InviteStatus status);

        List<WorkspaceInvite> findByWorkspace(Workspace workspace);
}