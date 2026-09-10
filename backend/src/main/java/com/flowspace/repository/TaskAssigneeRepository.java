package com.flowspace.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.User;

public interface TaskAssigneeRepository extends JpaRepository<TaskAssignee, Long> {

    List<TaskAssignee> findByTaskOrderByTaskAssigneeIdAsc(Task task);

    Optional<TaskAssignee> findByTaskAndUser(Task task, User user);

    void deleteByTask(Task task);

    boolean existsByTaskAndUser(Task task, User user);
}