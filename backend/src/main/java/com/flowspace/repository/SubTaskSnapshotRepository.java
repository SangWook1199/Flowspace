package com.flowspace.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.SubTaskSnapshot;
import com.flowspace.entity.TaskSnapshot;

public interface SubTaskSnapshotRepository extends JpaRepository<SubTaskSnapshot, Long> {

    List<SubTaskSnapshot> findBySnapshotOrderByPositionAsc(TaskSnapshot snapshot);

    // 여러 스냅샷의 하위 작업을 한 번에 읽어요(프로필 이미지까지 함께)
    @EntityGraph(attributePaths = "assigneeProfileFile")
    List<SubTaskSnapshot> findBySnapshotInOrderByPositionAsc(Collection<TaskSnapshot> snapshots);

}
