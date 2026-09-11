package com.flowspace.repository;

import com.flowspace.entity.SubTask;
import com.flowspace.entity.Task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubTaskRepository extends JpaRepository<SubTask, Long> {

    List<SubTask> findByTaskOrderByPositionAsc(Task task);

    long countByTask(Task task);
}