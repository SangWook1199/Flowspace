package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_database_rows")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabaseRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "row_id")
    private Long rowId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "database_id", nullable = false)
    private BlockDatabase database;

    // 노션처럼 데이터베이스의 행은 곧 페이지예요 — 행을 만들 때 같이 페이지를
    // 만들어 여기 연결하고, TITLE 컬럼은 이 페이지의 제목을 그대로 보여줘요.
    // DDL의 ON DELETE SET NULL은 페이지가 실제로 DELETE될 때만 동작하는데
    // pages는 소프트 삭제(is_deleted)라 여기서는 안 걸려요 — 그래서 행↔페이지
    // 양방향 삭제는 서비스 레이어(BlockDatabaseService/PageService)에서
    // 직접 처리해요.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id")
    private Page page;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void updatePosition(Integer position) {
        this.position = position;
    }
}