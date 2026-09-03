package com.flowspace.repository;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.TaskStatusCategory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findBySprint(Sprint sprint);

    List<Task> findByWorkspaceAndStatus(Workspace workspace, TaskStatus status);

    long countBySprint(Sprint sprint);

    long countBySprintAndStatus_Category(Sprint sprint, TaskStatusCategory category);

    List<Task> findByStatus(TaskStatus status);
}