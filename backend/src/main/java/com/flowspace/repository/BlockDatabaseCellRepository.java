package com.flowspace.repository;

import com.flowspace.entity.BlockDatabaseCell;
import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.id.BlockDatabaseCellId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlockDatabaseCellRepository extends JpaRepository<BlockDatabaseCell, BlockDatabaseCellId> {

    List<BlockDatabaseCell> findByRow(BlockDatabaseRow row);

    Optional<BlockDatabaseCell> findByRowAndColumn(BlockDatabaseRow row, BlockDatabaseColumn column);

}