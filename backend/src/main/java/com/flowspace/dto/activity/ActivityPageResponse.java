package com.flowspace.dto.activity;

import java.util.List;

import org.springframework.data.domain.Page;

// @formatter:off

// 활동 기록 한 페이지 응답 DTO (page는 0부터 시작)
public record ActivityPageResponse(

    List<ActivityResponse> items,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean hasNext

) {

    public static ActivityPageResponse from(Page<ActivityResponse> result) {
        return new ActivityPageResponse(
            result.getContent(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages(),
            result.hasNext()
        );
    }

}

// @formatter:on
