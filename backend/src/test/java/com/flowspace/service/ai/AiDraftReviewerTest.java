package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.entity.enums.TaskPriority;

// 고칠 수 없는 눈에 띄는 흠(늦은 준비 작업, 요청하지 않은 기능, 'A 또는 B', 놀고 있는 멤버)을 알아보는 규칙을 확인해요.
class AiDraftReviewerTest {

    private static final LocalDate START = LocalDate.of(2026, 10, 12);
    private static final LocalDate END = LocalDate.of(2026, 10, 25);

    private static AiDraftContext context(List<AiDraftContext.FixedEvent> events) {
        return new AiDraftContext(START, END, 2, Set.of(1L, 2L), events);
    }

    private static AiDraft.Task task(String title, String description, Long assignee, int fromDay, int toDay) {
        return new AiDraft.Task(title, description, TaskPriority.MEDIUM, assignee, LocalDate.of(2026, 10, fromDay),
            LocalDate.of(2026, 10, toDay));
    }

    private static List<AiDraft.Sprint> sprint(AiDraft.Task... tasks) {
        return List.of(new AiDraft.Sprint("a", "g", START, END, List.of(tasks)));
    }

    @Test
    @DisplayName("흠이 없으면 통과한다")
    void passesWhenClean() {
        List<AiDraft.Sprint> sprints = sprint(
            task("가", null, 1L, 12, 16), task("나", null, 2L, 12, 16),
            task("다", null, 1L, 19, 23), task("라", null, 2L, 19, 23));

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), ""));
    }

    @Test
    @DisplayName("고정 일정 뒤에 끝나는 준비 작업을 알린다")
    void latePreparation() {
        List<AiDraft.Sprint> sprints = sprint(
            task("중간 발표 자료 준비", null, 1L, 19, 23), task("나", null, 2L, 12, 23));
        List<AiDraftContext.FixedEvent> events = List.of(new AiDraftContext.FixedEvent("중간 발표", LocalDate.of(2026, 10, 20)));

        assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(sprints, context(events), ""));
    }

    @Test
    @DisplayName("고정 일정 뒤의 회고·후속 작업은 늦어도 괜찮다")
    void followUpAfterEventIsFine() {
        List<AiDraft.Sprint> sprints = sprint(
            task("중간 발표 피드백 반영", null, 1L, 21, 23), task("나", null, 2L, 12, 23));
        List<AiDraftContext.FixedEvent> events = List.of(new AiDraftContext.FixedEvent("중간 발표", LocalDate.of(2026, 10, 20)));

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(events), ""));
    }

    @Test
    @DisplayName("요청하지 않은 기능은 알리고, 요청에 적혀 있으면 괜찮다")
    void unrequestedFeature() {
        List<AiDraft.Sprint> sprints = sprint(task("내 정보 페이지", null, 1L, 12, 23), task("나", null, 2L, 12, 23));

        assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(sprints, context(List.of()), "중고 거래"));
        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), "내 정보 관리"));
    }

    @Test
    @DisplayName("'A 또는 B'처럼 정하지 않은 말을 알린다")
    void hedging() {
        List<AiDraft.Sprint> sprints = sprint(task("배포", "AWS 또는 GCP", 1L, 12, 23), task("나", null, 2L, 12, 23));

        assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(sprints, context(List.of()), ""));
    }

    @Test
    @DisplayName("나눌 만큼 작업이 있는데 한 멤버가 한 주를 통째로 쉬면 알린다")
    void idleMember() {
        List<AiDraft.Sprint> sprints = sprint(
            task("가", null, 1L, 12, 16), task("나", null, 2L, 12, 23),
            task("다", null, 1L, 12, 16), task("라", null, 2L, 12, 23));

        AiDraftException e = assertThrows(AiDraftException.class,
            () -> AiDraftReviewer.review(sprints, context(List.of()), ""));

        assertTrue(e.getMessage().contains("id 1"));
    }

    @Test
    @DisplayName("작업이 멤버 수 × 주 수보다 적으면 나눌 수 없어서 알리지 않는다")
    void fewTasksNotJudged() {
        List<AiDraft.Sprint> sprints = sprint(task("가", null, 1L, 12, 16), task("나", null, 1L, 12, 16));

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), ""));
    }

    @Test
    @DisplayName("멤버가 한 명이면 놀고 있는지 보지 않는다")
    void singleMember() {
        AiDraftContext single = new AiDraftContext(START, END, 2, Set.of(1L), List.of());
        List<AiDraft.Sprint> sprints = sprint(task("가", null, 1L, 12, 12), task("나", null, 1L, 12, 12));

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, single, ""));
    }

    @Test
    @DisplayName("채팅·찜·후기도 요청하지 않았으면 알리고, 요청에 적었으면 괜찮다")
    void chatWishlistReviewNeedRequest() {
        for (String title : List.of("실시간 채팅 구현", "찜 목록 구현", "거래 후기 작성")) {
            List<AiDraft.Sprint> sprints = sprint(task(title, null, 1L, 12, 23), task("나", null, 2L, 12, 23));

            assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(sprints, context(List.of()), "중고 거래"));
            assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), "중고 거래, 채팅, 찜, 후기"));
        }
    }

    @Test
    @DisplayName("API 엔드포인트의 '포인트'나 스프린트 리뷰는 요청하지 않은 기능으로 보지 않는다")
    void commonWordsAreNotFeatures() {
        List<AiDraft.Sprint> sprints = sprint(task("API 엔드포인트 정리", null, 1L, 12, 23), task("스프린트 리뷰 준비", null, 2L, 12, 23));

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), ""));
    }

    private static AiDraftContext rolesContext() {
        return new AiDraftContext(START, END, 2, java.util.Map.of(1L, "백엔드", 2L, "프런트엔드"), List.of());
    }

    @Test
    @DisplayName("검색이 API 작업뿐이면(담당자 역할로 판단) 화면 작업도 만들게 한다")
    void searchWithoutScreen() {
        List<AiDraft.Sprint> sprints = sprint(
            task("검색 및 필터링 기능 개선", null, 1L, 12, 14), task("상품 목록 페이지", null, 2L, 12, 14));

        AiDraftException e = assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(sprints, rolesContext(), ""));

        assertTrue(e.getMessage().contains("검색"));
        assertTrue(e.getMessage().contains("화면"));
    }

    @Test
    @DisplayName("화면 작업뿐인 기능도 알리고, 화면과 API가 다 있으면 통과한다")
    void pairedFeatures() {
        List<AiDraft.Sprint> onlyScreen = sprint(task("마이페이지 화면", null, 2L, 12, 14), task("나", null, 1L, 12, 14));
        List<AiDraft.Sprint> both = sprint(
            task("검색 API 개발", null, 1L, 12, 14), task("검색 화면 구현", null, 2L, 12, 14));

        assertThrows(AiDraftException.class, () -> AiDraftReviewer.review(onlyScreen, rolesContext(), "마이페이지"));
        assertDoesNotThrow(() -> AiDraftReviewer.review(both, rolesContext(), ""));
    }

    @Test
    @DisplayName("역할을 모르거나 한쪽 멤버만 있으면 짝을 보지 않는다")
    void pairingNeedsBothRoles() {
        List<AiDraft.Sprint> sprints = sprint(task("검색 기능 개선", null, 1L, 12, 14), task("나", null, 2L, 12, 14));
        AiDraftContext backOnly = new AiDraftContext(START, END, 2, java.util.Map.of(1L, "백엔드", 2L, "백엔드"), List.of());

        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, context(List.of()), ""));
        assertDoesNotThrow(() -> AiDraftReviewer.review(sprints, backOnly, ""));
    }
}
