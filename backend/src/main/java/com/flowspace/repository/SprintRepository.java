package com.flowspace.repository;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SprintRepository extends JpaRepository<Sprint, Long> {

    List<Sprint> findByWorkspaceOrderByStartDateDesc(Workspace workspace);

    List<Sprint> findByWorkspaceAndStatusOrderByStartDateDesc(Workspace workspace, SprintStatus status);

    Optional<Sprint> findFirstByWorkspaceAndStatusOrderByStartDateAsc(Workspace workspace, SprintStatus status);
}