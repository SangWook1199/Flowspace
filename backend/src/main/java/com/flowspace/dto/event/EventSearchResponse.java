package com.flowspace.dto.event;

import java.time.LocalDateTime;

import com.flowspace.entity.Event;

// @formatter:off

// Event 검색 응답 DTO
public record EventSearchResponse(

    Long eventId,
    String title,
    LocalDateTime startAt,
    LocalDateTime endAt

) {

    public static EventSearchResponse from(Event event) {
        return new EventSearchResponse(
            event.getEventId(),
            event.getTitle(),
            event.getStartDatetime(),
            event.getEndDatetime()
        );
    }

}

// @formatter:on