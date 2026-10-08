package com.flowspace.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.TaskSnapshot;
import com.flowspace.entity.TaskSnapshotAssignee;

public interface TaskSnapshotAssigneeRepository extends JpaRepository<TaskSnapshotAssignee, Long> {

    List<TaskSnapshotAssignee> findBySnapshotOrderBySnapshotAssigneeIdAsc(TaskSnapshot snapshot);

    // 여러 스냅샷의 담당자를 한 번에 읽어요(프로필 이미지까지 함께)
    @EntityGraph(attributePaths = "profileFile")
    List<TaskSnapshotAssignee> findBySnapshotInOrderBySnapshotAssigneeIdAsc(Collection<TaskSnapshot> snapshots);

}
