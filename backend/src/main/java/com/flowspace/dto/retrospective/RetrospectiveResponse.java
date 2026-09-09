package com.flowspace.dto.retrospective;

import java.util.List;

import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.entity.Retrospective;

// @formatter:off

public record RetrospectiveResponse(

    Long retrospectiveId,
    Long sprintId,
    RetrospectiveSummary summary,
    List<StatusSnapshotItem> statuses,
    List<TaskSnapshotItem> snapshots,
    PageDetailResponse page

) {

    public static RetrospectiveResponse from(
        Retrospective retrospective,
        RetrospectiveSummary summary,
        List<StatusSnapshotItem> statuses,
        List<TaskSnapshotItem> snapshots,
        PageDetailResponse page
    ) {

        return new RetrospectiveResponse(
            retrospective.getRetrospectiveId(),
            retrospective.getSprint().getSprintId(),
            summary,
            statuses,
            snapshots,
            page
        );
    }

}

// @formatter:on