package com.flowspace.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.TaskSnapshot;
import com.flowspace.entity.TaskSnapshotAssignee;

public interface TaskSnapshotAssigneeRepository extends JpaRepository<TaskSnapshotAssignee, Long> {

    List<TaskSnapshotAssignee> findBySnapshotOrderBySnapshotAssigneeIdAsc(TaskSnapshot snapshot);

}