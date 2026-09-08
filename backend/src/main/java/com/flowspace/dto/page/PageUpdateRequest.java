package com.flowspace.dto.page;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// @formatter:off

// 페이지 수정 요청 DTO
public record PageUpdateRequest(

    Long parentPageId,

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 200, message = "제목은 200자 이하입니다.")
    String title,

    @Size(max = 20, message = "아이콘은 20자 이하입니다.")
    String icon

) {
}

// @formatter:on