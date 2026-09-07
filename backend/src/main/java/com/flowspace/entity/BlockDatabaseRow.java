package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_database_rows")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabaseRow extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "row_id")
    private Long rowId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "database_id", nullable = false)
    private BlockDatabase database;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    public void updatePosition(Integer position) {
        this.position = position;
    }
}