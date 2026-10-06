package com.flowspace.dto.search;

import java.util.List;

// @formatter:off

// 통합 검색 응답 DTO (종류별로 최대 몇 개씩만 담아요)
public record SearchResponse(

    String keyword,
    List<SearchItem> pages,
    List<SearchItem> tasks,
    List<SearchItem> sprints,
    List<SearchItem> comments,
    List<SearchItem> events

) {

    // 검색 결과 한 줄
    //  - type: PAGE | TASK | SPRINT | COMMENT | EVENT
    //  - snippet: 검색어가 들어 있는 앞뒤 글 (제목에만 들어 있으면 null)
    //  - meta: 보조 정보 (작업 상태, 일정 날짜처럼 한 줄로 덧붙일 말)
    //  - link: 눌렀을 때 이동할 화면 경로
    public record SearchItem(

        String type,
        Long id,
        String title,
        String snippet,
        String icon,
        String meta,
        String link

    ) {}

    public static SearchResponse empty(String keyword) {
        return new SearchResponse(keyword, List.of(), List.of(), List.of(), List.of(), List.of());
    }
}

// @formatter:on
