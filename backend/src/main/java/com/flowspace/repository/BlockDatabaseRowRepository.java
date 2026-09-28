package com.flowspace.repository;

import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.Page;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlockDatabaseRowRepository extends JpaRepository<BlockDatabaseRow, Long> {

    List<BlockDatabaseRow> findByDatabaseOrderByPositionAsc(BlockDatabase database);

    // 페이지가 삭제될 때, 그 페이지를 가리키던(행 = 페이지) 다른 데이터베이스의
    // 행들을 같이 정리하기 위해 써요.
    List<BlockDatabaseRow> findByPage(Page page);

}