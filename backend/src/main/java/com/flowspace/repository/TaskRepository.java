package com.flowspace.repository;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.TaskStatusCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findBySprintOrderByPositionAsc(Sprint sprint);

    List<Task> findByWorkspaceAndSprintIsNullOrderByPositionAsc(Workspace workspace);

    List<Task> findByWorkspaceAndStatusOrderByPositionAsc(Workspace workspace, TaskStatus status);

    List<Task> findByStatusOrderByPositionAsc(TaskStatus status);

    long countBySprint(Sprint sprint);

    long countBySprintAndStatus_Category(Sprint sprint, TaskStatusCategory category);

    long countByWorkspaceAndSprintIsNull(Workspace workspace);

    List<Task> findBySprintAndStartDateBetweenOrderByStartDateAscPositionAsc(Sprint sprint, LocalDate start,
        LocalDate end);

    List<Task> findByWorkspaceAndSprintIsNullAndStartDateBetweenOrderByStartDateAscPositionAsc(Workspace workspace,
        LocalDate start, LocalDate end);

    List<Task> findByWorkspaceAndTitleContainingIgnoreCase(Workspace workspace, String keyword);
}