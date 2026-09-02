package com.flowspace.repository;

import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByWorkspace(Workspace workspace);

    List<Task> findBySprint(Sprint sprint);

    List<Task> findByAssignee(User assignee);

    List<Task> findByWorkspaceAndStatus(
            Workspace workspace,
            TaskStatus status);
}