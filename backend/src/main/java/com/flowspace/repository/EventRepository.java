package com.flowspace.repository;

import com.flowspace.entity.Event;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByWorkspace(Workspace workspace);

    List<Event> findByWorkspaceAndStartDatetimeBetween(
            Workspace workspace,
            LocalDateTime start,
            LocalDateTime end);
}