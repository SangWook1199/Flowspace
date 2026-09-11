package com.flowspace.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Retrospective;
import com.flowspace.entity.TaskSnapshot;

public interface TaskSnapshotRepository extends JpaRepository<TaskSnapshot, Long> {

    List<TaskSnapshot> findByRetrospectiveOrderBySnapshotStatus_PositionAscPositionAsc(Retrospective retrospective);

}