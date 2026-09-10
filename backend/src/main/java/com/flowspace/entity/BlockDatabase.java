package com.flowspace.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import com.flowspace.entity.enums.DatabaseViewType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_databases")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "database_id")
    private Long databaseId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false, unique = true)
    private Block block;

    @Column(name = "title", nullable = false, length = 100)
    @Builder.Default
    private String title = "제목 없음";

    @Enumerated(EnumType.STRING)
    @Column(name = "view_type", nullable = false, length = 20)
    @Builder.Default
    private DatabaseViewType viewType = DatabaseViewType.TABLE;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateViewType(DatabaseViewType viewType) {
        this.viewType = viewType;
    }
}