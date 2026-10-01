package com.flowspace.dto.page;

// @formatter:off

// 페이지 복제 요청 DTO (parentPageId가 없으면 원본과 같은 위치에 복제)
public record PageDuplicateRequest(

    Long parentPageId

) {
}

// @formatter:on
