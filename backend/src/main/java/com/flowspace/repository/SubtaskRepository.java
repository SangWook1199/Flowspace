package com.flowspace.repository;

import com.flowspace.entity.Subtask;
import com.flowspace.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubtaskRepository extends JpaRepository<Subtask, Long> {

    List<Subtask> findByTaskOrderByPositionAsc(Task task);
}