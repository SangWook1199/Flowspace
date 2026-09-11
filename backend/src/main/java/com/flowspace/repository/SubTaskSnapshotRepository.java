package com.flowspace.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.SubTaskSnapshot;
import com.flowspace.entity.TaskSnapshot;

public interface SubTaskSnapshotRepository extends JpaRepository<SubTaskSnapshot, Long> {

    List<SubTaskSnapshot> findBySnapshotOrderByPositionAsc(TaskSnapshot snapshot);

}