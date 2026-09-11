package com.flowspace.dto.activity;

import java.util.List;

import org.springframework.data.domain.Page;

// @formatter:off

public record ActivityPageResponse(

    List<ActivityResponse> activities,

    Integer page,
    Integer totalPages,

    Long totalElements,

    Boolean hasNext

) {

    public static ActivityPageResponse from(Page<ActivityResponse> page) {
        return new ActivityPageResponse(
            page.getContent(),

            page.getNumber(),
            page.getTotalPages(),

            page.getTotalElements(),

            page.hasNext()
        );
    }

}

// @formatter:on