package com.flowspace.entity;

import com.flowspace.entity.id.BlockDatabaseCellId;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "block_database_cells")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlockDatabaseCell {

    @EmbeddedId
    private BlockDatabaseCellId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("rowId")
    @JoinColumn(name = "row_id")
    private BlockDatabaseRow row;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("columnId")
    @JoinColumn(name = "column_id")
    private BlockDatabaseColumn column;

    @Column(name = "value", columnDefinition = "TEXT")
    private String value;

    public void updateValue(String value) {
        this.value = value;
    }
}