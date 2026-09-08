package com.flowspace.repository;

import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlockDatabaseColumnRepository extends JpaRepository<BlockDatabaseColumn, Long> {

    List<BlockDatabaseColumn> findByDatabaseOrderByPositionAsc(BlockDatabase database);

}