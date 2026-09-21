package com.flowspace.repository;

import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.BlockDatabaseColumnOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlockDatabaseColumnOptionRepository extends JpaRepository<BlockDatabaseColumnOption, Long> {

    List<BlockDatabaseColumnOption> findByColumnOrderByPositionAsc(BlockDatabaseColumn column);

}
