package com.flowspace.repository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Page;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlockRepository extends JpaRepository<Block, Long> {

    List<Block> findByPageOrderByPositionAsc(Page page);

    List<Block> findByParentBlockOrderByPositionAsc(Block parentBlock);
}