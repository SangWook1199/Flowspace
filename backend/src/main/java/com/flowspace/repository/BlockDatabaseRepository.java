package com.flowspace.repository;

import com.flowspace.entity.Block;
import com.flowspace.entity.BlockDatabase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BlockDatabaseRepository extends JpaRepository<BlockDatabase, Long> {

    Optional<BlockDatabase> findByBlock(Block block);

}