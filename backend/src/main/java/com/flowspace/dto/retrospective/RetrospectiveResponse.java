package com.flowspace.dto.retrospective;

import java.time.LocalDate;
import java.util.List;

import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.entity.Retrospective;

// @formatter:off

public record RetrospectiveResponse(

    Long retrospectiveId,
    Long sprintId,
    String sprintName,
    LocalDate startDate,
    LocalDate endDate,
    Long pageId,
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
            retrospective.getSprint().getName(),
            retrospective.getSprint().getStartDate(),
            retrospective.getSprint().getEndDate(),
            retrospective.getPage().getPageId(),
            summary,
            statuses,
            snapshots,
            page
        );
    }

}

// @formatter:on