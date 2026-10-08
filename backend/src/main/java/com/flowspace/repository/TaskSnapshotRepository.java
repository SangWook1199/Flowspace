package com.flowspace.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Retrospective;
import com.flowspace.entity.TaskSnapshot;

public interface TaskSnapshotRepository extends JpaRepository<TaskSnapshot, Long> {

    // 상태 이름·순서를 같이 읽어요(스냅샷마다 따로 읽지 않게)
    @EntityGraph(attributePaths = "snapshotStatus")
    List<TaskSnapshot> findByRetrospectiveOrderBySnapshotStatus_PositionAscPositionAsc(Retrospective retrospective);

    // 여러 회고의 스냅샷을 한 번에 읽어요(회고 목록용)
    @EntityGraph(attributePaths = "snapshotStatus")
    List<TaskSnapshot> findByRetrospectiveInOrderBySnapshotStatus_PositionAscPositionAsc(
        Collection<Retrospective> retrospectives);

}
