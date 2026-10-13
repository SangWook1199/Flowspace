package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.entity.enums.TaskPriority;

// 역할에 맞지 않는 담당자를 서버가 바로잡는 규칙을 확인해요.
class AiRoleAssignerTest {

    private static final LocalDate START = LocalDate.of(2026, 10, 12);

    private static AiDraftContext context(Map<Long, String> roles) {
        return new AiDraftContext(START, LocalDate.of(2026, 10, 25), 2, roles, List.of());
    }

    private static Map<Long, String> roles(String... roleByOrder) {
        Map<Long, String> map = new LinkedHashMap<>();
        for (int i = 0; i < roleByOrder.length; i++) {
            map.put(i + 1L, roleByOrder[i]);
        }
        return map;
    }

    private static AiPlannedTask task(String title, Long assignee) {
        return new AiPlannedTask(title, null, TaskPriority.MEDIUM, assignee, 1, 2);
    }

    @Test
    @DisplayName("역할을 알아본다")
    void readsRoles() {
        assertEquals(AiRoleAssigner.Side.FRONT, AiRoleAssigner.sideOfRole("프런트엔드"));
        assertEquals(AiRoleAssigner.Side.FRONT, AiRoleAssigner.sideOfRole("Frontend"));
        assertEquals(AiRoleAssigner.Side.BACK, AiRoleAssigner.sideOfRole("백엔드 개발"));
        assertEquals(AiRoleAssigner.Side.BOTH, AiRoleAssigner.sideOfRole("프런트·백엔드"));
        assertEquals(AiRoleAssigner.Side.NONE, AiRoleAssigner.sideOfRole("기획"));
        assertEquals(AiRoleAssigner.Side.NONE, AiRoleAssigner.sideOfRole(null));
    }

    @Test
    @DisplayName("작업이 어느 쪽 일인지 알아본다")
    void readsTasks() {
        assertEquals(AiRoleAssigner.Side.FRONT, AiRoleAssigner.sideOfTask("인증 인터셉터 및 상태 관리"));
        assertEquals(AiRoleAssigner.Side.FRONT, AiRoleAssigner.sideOfTask("로그인 페이지 UI"));
        assertEquals(AiRoleAssigner.Side.BACK, AiRoleAssigner.sideOfTask("DB 스키마 설계"));
        assertEquals(AiRoleAssigner.Side.BOTH, AiRoleAssigner.sideOfTask("API 연동 화면 구현"));
        assertEquals(AiRoleAssigner.Side.NONE, AiRoleAssigner.sideOfTask("회의 정리"));
    }

    @Test
    @DisplayName("프런트 작업이 백엔드 멤버에게 가 있으면 일이 가장 적은 프런트 멤버에게 넘긴다")
    void movesFrontTaskToLightestFrontMember() {
        // 1: 백엔드, 2·3: 프런트. 2번에게 이미 작업이 있어서 3번이 받아야 해요.
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(
            task("인증 인터셉터 및 상태 관리", 1L),
            task("로그인 페이지 UI", 2L)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "프런트엔드", "프런트엔드")));

        assertEquals(3L, tasks.get(0).assignee());
        assertEquals(2L, tasks.get(1).assignee());
    }

    @Test
    @DisplayName("일이 같으면 id가 작은 멤버에게 넘긴다")
    void tieGoesToLowerId() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("메인 화면 구현", 1L)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "프런트엔드", "프런트엔드")));

        assertEquals(2L, tasks.get(0).assignee());
    }

    @Test
    @DisplayName("백엔드 작업이 프런트 멤버에게 가 있어도 바로잡는다")
    void movesBackTaskToBackMember() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("DB 스키마 설계", 2L)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "프런트엔드")));

        assertEquals(1L, tasks.get(0).assignee());
    }

    @Test
    @DisplayName("역할이 맞거나 양쪽 일인 작업, 담당자가 없는 작업은 건드리지 않는다")
    void leavesOthersAlone() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(
            task("로그인 페이지 UI", 2L),
            task("API 연동 화면 구현", 1L),
            task("회의 정리", 1L),
            task("메인 화면 구현", null)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "프런트엔드")));

        assertEquals(2L, tasks.get(0).assignee());
        assertEquals(1L, tasks.get(1).assignee());
        assertEquals(1L, tasks.get(2).assignee());
        assertEquals(null, tasks.get(3).assignee());
    }

    @Test
    @DisplayName("프런트와 백엔드를 다 하는 멤버에게 간 작업은 건드리지 않는다")
    void bothSideMemberKeepsTask() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("메인 화면 구현", 1L)));

        AiRoleAssigner.fix(tasks, context(roles("프런트·백엔드", "프런트엔드")));

        assertEquals(1L, tasks.get(0).assignee());
    }

    @Test
    @DisplayName("맡길 수 있는 멤버가 없으면 그대로 둔다")
    void noBetterMember() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("메인 화면 구현", 1L)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "백엔드")));

        assertEquals(1L, tasks.get(0).assignee());
    }

    @Test
    @DisplayName("역할을 모르면 아무것도 바꾸지 않는다")
    void noRolesNoChange() {
        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("메인 화면 구현", 1L)));

        AiRoleAssigner.fix(tasks, new AiDraftContext(START, LocalDate.of(2026, 10, 25), 2, Set.of(1L, 2L), List.of()));

        assertEquals(1L, tasks.get(0).assignee());
    }

    @Test
    @DisplayName("배포 작업은 백엔드 일로 보고, 프런트 멤버에게 가 있으면 백엔드 멤버에게 넘긴다")
    void deployIsBackendWork() {
        assertEquals(AiRoleAssigner.Side.BACK, AiRoleAssigner.sideOfTask("최종 배포 및 발표 자료 준비"));
        assertEquals(AiRoleAssigner.Side.BACK, AiRoleAssigner.sideOfTask("서버 배포 환경 구축"));
        assertEquals(AiRoleAssigner.Side.BOTH, AiRoleAssigner.sideOfTask("프런트 배포"));

        List<AiPlannedTask> tasks = new ArrayList<>(List.of(task("최종 배포 및 발표 자료 준비", 2L)));

        AiRoleAssigner.fix(tasks, context(roles("백엔드", "프런트엔드")));

        assertEquals(1L, tasks.get(0).assignee());
    }
}
