package com.flowspace.dto.page;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

// @formatter:off

// 페이지 순서 변경 요청 DTO (목록 순서가 곧 표시 순서, 같은 상위 페이지의 페이지만 가능)
public record PageReorderRequest(

    @NotEmpty(message = "페이지 목록은 비어 있을 수 없습니다.")
    List<Long> pageIds

) {
}

// @formatter:on
