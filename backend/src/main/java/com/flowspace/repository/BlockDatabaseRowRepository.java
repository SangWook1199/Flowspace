package com.flowspace.repository;

import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlockDatabaseRowRepository extends JpaRepository<BlockDatabaseRow, Long> {

    List<BlockDatabaseRow> findByDatabaseOrderByPositionAsc(BlockDatabase database);

}