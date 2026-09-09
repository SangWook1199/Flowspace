package com.flowspace.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Retrospective;
import com.flowspace.entity.RetrospectiveStatusSnapshot;

public interface RetrospectiveStatusSnapshotRepository extends JpaRepository<RetrospectiveStatusSnapshot, Long> {

    List<RetrospectiveStatusSnapshot> findByRetrospectiveOrderByPositionAsc(Retrospective retrospective);

}