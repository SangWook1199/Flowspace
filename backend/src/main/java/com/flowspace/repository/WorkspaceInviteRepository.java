package com.flowspace.repository;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.enums.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkspaceInviteRepository extends JpaRepository<WorkspaceInvite, Long> {

        List<WorkspaceInvite> findByWorkspace(Workspace workspace);

        List<WorkspaceInvite> findByEmailAndStatus(String email, InviteStatus status);

        Optional<WorkspaceInvite> findByWorkspaceAndEmailAndStatus(Workspace workspace, String email,
                InviteStatus status);

        // 오래도록 답이 없는 초대를 지워요(정리 작업용)
        @Modifying
        @Query("delete from WorkspaceInvite i where i.status = :status and i.createdAt < :before")
        int deleteByStatusAndCreatedAtBefore(@Param("status") InviteStatus status, @Param("before") LocalDateTime before);
}