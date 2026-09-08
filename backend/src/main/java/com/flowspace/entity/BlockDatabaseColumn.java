package com.flowspace.entity;

import com.flowspace.entity.enums.DatabaseColumnType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_database_columns")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabaseColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "column_id")
    private Long columnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "database_id", nullable = false)
    private BlockDatabase database;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    @Builder.Default
    private DatabaseColumnType type = DatabaseColumnType.TEXT;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    public void update(String name, DatabaseColumnType type) {
        this.name = name;
        this.type = type;
    }

    public void updatePosition(Integer position) {
        this.position = position;
    }
}