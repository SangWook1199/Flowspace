package com.flowspace.dto.retrospective;

import java.time.LocalDate;

import com.flowspace.entity.Retrospective;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.enums.SprintStatus;

// @formatter:off

// 회고 목록 항목 (회고가 아직 없는 스프린트는 retrospectiveId와 통계가 null)
public record RetrospectiveListItem(

    Long sprintId,
    String sprintName,
    SprintStatus sprintStatus,
    LocalDate startDate,
    LocalDate endDate,
    String goal,

    Long retrospectiveId,
    Long pageId,

    Integer completionRate,
    Integer completedTask,
    Integer incompleteTask,
    Integer totalTask,
    Integer participantCount,
    Integer actionItemCount

) {

    // 회고가 생성된 스프린트
    public static RetrospectiveListItem of(
        Sprint sprint,
        Retrospective retrospective,
        RetrospectiveSummary summary,
        int actionItemCount
    ) {
        return new RetrospectiveListItem(
            sprint.getSprintId(),
            sprint.getName(),
            sprint.getStatus(),
            sprint.getStartDate(),
            sprint.getEndDate(),
            sprint.getGoal(),
            retrospective.getRetrospectiveId(),
            retrospective.getPage().getPageId(),
            summary.completionRate(),
            summary.completedTask(),
            summary.incompleteTask(),
            summary.totalTask(),
            summary.participants().size(),
            actionItemCount
        );
    }

    // 아직 회고가 없는 스프린트
    public static RetrospectiveListItem withoutRetrospective(Sprint sprint) {
        return new RetrospectiveListItem(
            sprint.getSprintId(),
            sprint.getName(),
            sprint.getStatus(),
            sprint.getStartDate(),
            sprint.getEndDate(),
            sprint.getGoal(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

}

// @formatter:on
