package com.flowspace.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Retrospective;
import com.flowspace.entity.Sprint;

public interface RetrospectiveRepository extends JpaRepository<Retrospective, Long> {

    Optional<Retrospective> findBySprint(Sprint sprint);

    boolean existsBySprint(Sprint sprint);

}