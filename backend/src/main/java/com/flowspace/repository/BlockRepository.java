package com.flowspace.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.Block;
import com.flowspace.entity.Page;
import com.flowspace.entity.enums.BlockType;

public interface BlockRepository extends JpaRepository<Block, Long> {

    List<Block> findByPageOrderByPositionAsc(Page page);

    // 페이지 상세용: 이미지 파일과 데이터베이스 연결을 블록마다 따로 읽지 않고 함께 읽어요
    @EntityGraph(attributePaths = { "imageFile", "database" })
    List<Block> findWithImageAndDatabaseByPageOrderByPositionAsc(Page page);

    List<Block> findByParentBlockOrderByPositionAsc(Block parentBlock);

    List<Block> findByPageAndParentBlockOrderByPositionAsc(Page page, Block parentBlock);

    // 여러 페이지에서 특정 종류의 블록만 한 번에 읽어요
    List<Block> findByPageInAndType(Collection<Page> pages, BlockType type);

    Optional<Block> findByBlockId(Long blockId);
}