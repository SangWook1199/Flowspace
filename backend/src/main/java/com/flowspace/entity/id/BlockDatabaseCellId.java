package com.flowspace.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BlockDatabaseCellId implements Serializable {

    @Column(name = "row_id")
    private Long rowId;

    @Column(name = "column_id")
    private Long columnId;
}