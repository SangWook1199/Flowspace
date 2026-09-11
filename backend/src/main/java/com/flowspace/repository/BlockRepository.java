package com.flowspace.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Page;

public interface BlockRepository extends JpaRepository<Block, Long> {

    List<Block> findByPageOrderByPositionAsc(Page page);

    List<Block> findByParentBlockOrderByPositionAsc(Block parentBlock);

    List<Block> findByPageAndParentBlockOrderByPositionAsc(Page page, Block parentBlock);

    Optional<Block> findByBlockId(Long blockId);
}