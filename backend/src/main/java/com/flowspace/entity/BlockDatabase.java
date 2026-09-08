package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_databases")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabase extends BaseEntity {

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

    @Column(name = "is_database", nullable = false)
    @Builder.Default
    private Boolean isDatabase = false;

    public void updateTitle(String title) {
        this.title = title;
    }

    public void convertToDatabase() {
        this.isDatabase = true;
    }
}