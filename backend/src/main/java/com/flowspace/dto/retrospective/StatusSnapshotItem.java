package com.flowspace.dto.retrospective;

import com.flowspace.entity.RetrospectiveStatusSnapshot;

// @formatter:off

public record StatusSnapshotItem(

    Long snapshotStatusId,
    String name,
    String color,
    Integer position

) {

    public static StatusSnapshotItem from(RetrospectiveStatusSnapshot status) {
        return new StatusSnapshotItem(
            status.getSnapshotStatusId(),
            status.getName(),
            status.getColor(),
            status.getPosition()
        );
    }

}

// @formatter:on