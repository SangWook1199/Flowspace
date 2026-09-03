package com.flowspace.repository;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.enums.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceInviteRepository extends JpaRepository<WorkspaceInvite, Long> {

        List<WorkspaceInvite> findByWorkspace(Workspace workspace);

        List<WorkspaceInvite> findByEmailAndStatus(String email, InviteStatus status);

        Optional<WorkspaceInvite> findByWorkspaceAndEmailAndStatus(Workspace workspace, String email,
                InviteStatus status);
}