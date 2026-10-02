package com.flowspace.repository;

import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

        List<WorkspaceMember> findByWorkspace(Workspace workspace);

        List<WorkspaceMember> findByUser(User user);

        Optional<WorkspaceMember> findByWorkspaceAndUser(Workspace workspace, User user);

        boolean existsByWorkspaceAndUser(Workspace workspace, User user);

        // 나와 같은 워크스페이스에 속한 다른 사용자들의 id (여러 워크스페이스가 겹쳐도 한 번씩만)
        @Query("select distinct other.user.userId from WorkspaceMember mine, WorkspaceMember other "
                + "where mine.user.userId = :userId and other.workspace = mine.workspace and other.user.userId <> :userId")
        List<Long> findCoMemberIds(@Param("userId") Long userId);
}