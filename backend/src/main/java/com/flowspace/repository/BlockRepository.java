package com.flowspace.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowspace.entity.Block;
import com.flowspace.entity.File;
import com.flowspace.entity.Page;
import com.flowspace.entity.enums.BlockType;

public interface BlockRepository extends JpaRepository<Block, Long> {

    List<Block> findByPageOrderByPositionAsc(Page page);

    // 페이지 상세용: 이미지 파일과 데이터베이스 연결을 블록마다 따로 읽지 않고 함께 읽어요
    @EntityGraph(attributePaths = { "imageFile", "database" })
    List<Block> findWithImageAndDatabaseByPageOrderByPositionAsc(Page page);

    // 페이지를 영구 삭제하기 전에 이 페이지 블록들이 쓰는 이미지 파일만 읽어요.
    // 블록(Block) 자체를 읽으면 안 돼요 — 블록이 영속성 컨텍스트에 남은 채 그 페이지를 지우면
    // flush 때 "삭제된 Page를 가리키는 Block" 오류(TransientPropertyValueException)가 나요.
    // 블록 행은 DB의 ON DELETE CASCADE가 알아서 지워요.
    @Query("select distinct b.imageFile from Block b where b.page = :page and b.imageFile is not null")
    List<File> findImageFilesByPage(@Param("page") Page page);

    List<Block> findByParentBlockOrderByPositionAsc(Block parentBlock);

    List<Block> findByPageAndParentBlockOrderByPositionAsc(Page page, Block parentBlock);

    // 여러 페이지에서 특정 종류의 블록만 한 번에 읽어요
    List<Block> findByPageInAndType(Collection<Page> pages, BlockType type);

    Optional<Block> findByBlockId(Long blockId);
}