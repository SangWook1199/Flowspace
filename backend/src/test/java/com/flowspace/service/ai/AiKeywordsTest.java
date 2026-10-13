package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

// 작업 제목에서 낱말을 찾는 규칙(띄어쓰기·대소문자 무시, 영어 낱말은 단어 경계)을 확인해요.
class AiKeywordsTest {

    @Test
    @DisplayName("띄어쓰기와 대소문자를 무시한다")
    void ignoresSpacesAndCase() {
        assertEquals("db설계", AiKeywords.squash("DB  설 계"));
        assertTrue(AiKeywords.hasAny("DB 설계 하기", List.of("db설계")));
    }

    @Test
    @DisplayName("영어 낱말은 다른 영어 단어의 일부일 때 찾지 않는다")
    void asciiWordNeedsBoundary() {
        assertFalse(AiKeywords.hasAny("build 환경 구성", List.of("ui")));
        assertTrue(AiKeywords.hasAny("로그인 UI 만들기", List.of("ui")));
        assertTrue(AiKeywords.hasAny("REST API 설계", List.of("api")));
        assertFalse(AiKeywords.hasAny("rapid 작업", List.of("api")));
        assertFalse(AiKeywords.hasAny("form 검증", List.of("orm")));
        // 긴 영어 낱말은 단어 일부여도 찾는다(Frontend 안의 front)
        assertTrue(AiKeywords.hasAny("Frontend", List.of("front")));
    }

    @Test
    @DisplayName("한글 낱말은 어디에 있어도 찾는다")
    void koreanWordMatchesAnywhere() {
        assertTrue(AiKeywords.hasAny("서버 배포 환경 구축", List.of("배포환경")));
        assertFalse(AiKeywords.hasAny(null, List.of("배포환경")));
    }
}
