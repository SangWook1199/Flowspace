package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

// 모델이 쓴 글을 정리하는 규칙(마크다운 제거, 글자 수 제한, 조사 교정)을 확인해요.
class AiTextTest {

    @Test
    @DisplayName("HTML 태그·마크다운 기호·줄바꿈을 지우고 공백을 하나로 모은다")
    void plainText() {
        assertEquals("로그인 API 구현하기", AiText.clean("<b>**로그인**</b>\n  API   `구현`하기", 200));
        assertEquals("제목", AiText.clean("## 제목", 200));
    }

    @Test
    @DisplayName("글자 수 제한을 넘으면 자른다")
    void truncates() {
        assertEquals(5, AiText.clean("가나다라마바사", 5).length());
    }

    @Test
    @DisplayName("설명은 줄바꿈을 살리고 빈 줄은 지운다")
    void descriptionKeepsLines() {
        assertEquals("첫째 줄\n둘째 줄", AiText.cleanDescription("첫째  줄\r\n\r\n<i>둘째 줄</i>"));
        assertNull(AiText.cleanDescription("   "));
    }


    @Test
    @DisplayName("받침에 맞지 않는 와/과를 고친다")
    void fixesParticles() {
        assertEquals("상품 관리와 탐색 기능", AiText.fixParticles("상품 관리과 탐색 기능"));
        assertEquals("검색과 필터", AiText.fixParticles("검색와 필터"));
        assertEquals("로그인과 DB 구조", AiText.fixParticles("로그인와 DB 구조"));
        assertEquals("화면 설계와", AiText.fixParticles("화면 설계과"));
    }

    @Test
    @DisplayName("맞는 조사와 '결과·효과' 같은 낱말은 그대로 둔다")
    void keepsCorrectParticlesAndNouns() {
        assertEquals("회원가입과 로그인", AiText.fixParticles("회원가입과 로그인"));
        assertEquals("데이터와 서버", AiText.fixParticles("데이터와 서버"));
        assertEquals("서울과 부산", AiText.fixParticles("서울과 부산"));
        assertEquals("효과 분석", AiText.fixParticles("효과 분석"));
        assertEquals("테스트 결과 정리", AiText.fixParticles("테스트 결과 정리"));
        assertEquals("성능 개선 효과, 사과 정리", AiText.fixParticles("성능 개선 효과, 사과 정리"));
        assertEquals("와이파이 설정", AiText.fixParticles("와이파이 설정"));
        assertEquals("DB와 API", AiText.fixParticles("DB와 API"));
        assertNull(AiText.fixParticles(null));
    }

}
