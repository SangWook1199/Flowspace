package com.flowspace.repository;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.TaskStatusCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findBySprintOrderByPositionAsc(Sprint sprint);

    List<Task> findByWorkspaceAndSprintIsNullOrderByPositionAsc(Workspace workspace);

    List<Task> findByWorkspaceAndStatusOrderByPositionAsc(Workspace workspace, TaskStatus status);

    List<Task> findByStatusOrderByPositionAsc(TaskStatus status);

    // 워크스페이스에서 지금까지 쓴 가장 큰 작업 번호(작업이 없으면 0)
    @Query("select coalesce(max(t.taskNumber), 0) from Task t where t.workspace = :workspace")
    int findMaxTaskNumber(@Param("workspace") Workspace workspace);

    long countBySprint(Sprint sprint);

    long countBySprintAndStatus_Category(Sprint sprint, TaskStatusCategory category);

    long countByWorkspaceAndSprintIsNull(Workspace workspace);

    List<Task> findBySprintAndStartDateBetweenOrderByStartDateAscPositionAsc(Sprint sprint, LocalDate start,
        LocalDate end);

    List<Task> findByWorkspaceAndSprintIsNullAndStartDateBetweenOrderByStartDateAscPositionAsc(Workspace workspace,
        LocalDate start, LocalDate end);

    List<Task> findByWorkspaceAndTitleContainingIgnoreCase(Workspace workspace, String keyword);

    // 마감일이 date이고 아직 완료 상태가 아닌 작업 (마감 임박 알림용)
    List<Task> findByEndDateAndStatus_CategoryNot(LocalDate endDate, TaskStatusCategory category);

    // 워크스페이스 삭제 직전에 그 안의 작업을 한 번에 지워요(tasks FK에 CASCADE가 없어서 먼저 지워야 해요).
    // 담당자·하위 작업·댓글은 DB의 ON DELETE CASCADE로 함께 지워져요.
    @Modifying(flushAutomatically = true)
    @Query("delete from Task t where t.workspace = :workspace")
    void deleteAllByWorkspace(@Param("workspace") Workspace workspace);
}
