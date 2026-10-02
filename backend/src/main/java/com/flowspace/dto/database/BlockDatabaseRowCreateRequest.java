package com.flowspace.dto.database;

// @formatter:off

// 데이터베이스 행 생성 요청 DTO (본문은 생략 가능)
public record BlockDatabaseRowCreateRequest(

    // 행에 연결할 기존 페이지 (없으면 새 페이지를 만들어요)
    Long pageId

) {
}

// @formatter:on
