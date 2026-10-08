package com.flowspace.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.TaskStatusCategory;

public interface TaskAssigneeRepository extends JpaRepository<TaskAssignee, Long> {

    List<TaskAssignee> findByTaskOrderByTaskAssigneeIdAsc(Task task);

    // 여러 작업의 담당자를 한 번에 읽어요(사용자·프로필 이미지까지 함께)
    @Query("select ta from TaskAssignee ta join fetch ta.user u left join fetch u.profileFile "
        + "where ta.task in :tasks order by ta.taskAssigneeId asc")
    List<TaskAssignee> findByTasks(@Param("tasks") Collection<Task> tasks);

    Optional<TaskAssignee> findByTaskAndUser(Task task, User user);

    void deleteByTask(Task task);

    boolean existsByTaskAndUser(Task task, User user);

    // 이 워크스페이스에서 사용자가 맡은, 아직 끝나지 않은 작업 (마감일이 빠른 순, 마감일 없는 건 맨 뒤)
    @Query("select ta.task from TaskAssignee ta where ta.user = :user and ta.task.workspace = :workspace "
        + "and ta.task.status.category <> :done "
        + "order by case when ta.task.endDate is null then 1 else 0 end, ta.task.endDate asc, ta.task.taskId desc")
    List<Task> findOpenTasks(@Param("user") User user, @Param("workspace") Workspace workspace,
        @Param("done") TaskStatusCategory done, Pageable pageable);

    @Query("select count(ta) from TaskAssignee ta where ta.user = :user and ta.task.workspace = :workspace "
        + "and ta.task.status.category <> :done")
    long countOpen(@Param("user") User user, @Param("workspace") Workspace workspace,
        @Param("done") TaskStatusCategory done);

    @Query("select count(ta) from TaskAssignee ta where ta.user = :user and ta.task.workspace = :workspace "
        + "and ta.task.status.category = :done")
    long countDone(@Param("user") User user, @Param("workspace") Workspace workspace,
        @Param("done") TaskStatusCategory done);

    // 탈퇴할 때 사용자가 맡은 작업의 담당자 표시를 모두 지워요.
    @Modifying
    @Query("delete from TaskAssignee ta where ta.user = :user")
    int deleteByUser(@Param("user") User user);
}