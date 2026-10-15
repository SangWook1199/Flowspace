package com.flowspace.repository;

import com.flowspace.entity.SubTask;
import com.flowspace.entity.Task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SubTaskRepository extends JpaRepository<SubTask, Long> {

    List<SubTask> findByTaskOrderByPositionAsc(Task task);

    // 여러 작업의 하위 작업을 한 번에 읽어요
    List<SubTask> findByTaskInOrderByPositionAsc(Collection<Task> tasks);

    long countByTask(Task task);
}