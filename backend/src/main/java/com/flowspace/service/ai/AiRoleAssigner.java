package com.flowspace.service.ai;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.flowspace.dto.ai.AiDraftContext;

// 역할에 맞지 않는 담당자를 서버가 바로잡아요. 예를 들어 "로그인 페이지 UI" 작업이 백엔드 멤버에게 가 있으면,
// 같은 스프린트에서 일이 가장 적은 프런트 멤버에게 넘겨요. 다시 만들게 하지 않고 서버가 고치니까 시간이 들지 않아요.
// 역할과 작업이 "분명히" 한쪽일 때만 고쳐요(둘 다 걸리거나 어느 쪽도 아니면 모델의 선택을 그대로 둬요).
final class AiRoleAssigner {

    enum Side { BACK, FRONT, BOTH, NONE }

    private static final List<String> FRONT_ROLE = List.of("프런트", "프론트", "front", "ui", "ux", "화면", "퍼블리", "디자인", "클라이언트", "react", "vue");
    private static final List<String> BACK_ROLE = List.of("백엔드", "backend", "back-end", "서버", "api", "db", "데이터베이스", "인프라", "devops", "spring");

    // 작업 제목에서 프런트/백엔드 일을 알아보는 낱말
    private static final List<String> FRONT_TASK = List.of("페이지", "화면", "컴포넌트", "폼", "상태관리", "반응형", "프런트", "프론트",
        "스타일", "퍼블리싱", "디자인", "레이아웃", "애니메이션", "ui", "ux", "css", "react");
    private static final List<String> BACK_TASK = List.of("서버", "데이터베이스", "스키마", "쿼리", "백엔드", "로직", "스케줄러",
        "마이그레이션", "캐싱", "캐시", "웹소켓", "api", "db", "sql", "jwt", "orm", "배포", "인프라", "ci/cd", "cicd", "도커", "docker");

    private AiRoleAssigner() {
    }

    static Side sideOfRole(String role) {
        return sideOf(role, FRONT_ROLE, BACK_ROLE);
    }

    static Side sideOfTask(String title) {
        return sideOf(title, FRONT_TASK, BACK_TASK);
    }

    private static Side sideOf(String text, List<String> frontWords, List<String> backWords) {

        boolean front = AiKeywords.hasAny(text, frontWords);
        boolean back = AiKeywords.hasAny(text, backWords);

        if (front && back) {
            return Side.BOTH;
        }

        return front ? Side.FRONT : back ? Side.BACK : Side.NONE;
    }

    // 한 스프린트의 작업 목록을 제자리에서 고쳐요. 역할을 모르면(context에 역할이 없으면) 아무것도 안 해요.
    static void fix(List<AiPlannedTask> tasks, AiDraftContext context) {

        Map<Long, Side> roles = new HashMap<>();

        context.memberRoles().forEach((id, role) -> roles.put(id, sideOfRole(role)));

        if (roles.values().stream().noneMatch(side -> side == Side.FRONT || side == Side.BACK)) {
            return;
        }

        Map<Long, Integer> load = new HashMap<>();

        for (AiPlannedTask task : tasks) {
            if (task.assignee() != null) {
                load.merge(task.assignee(), 1, Integer::sum);
            }
        }

        for (int index = 0; index < tasks.size(); index++) {

            AiPlannedTask task = tasks.get(index);
            Side taskSide = sideOfTask(task.title());

            if (task.assignee() == null || (taskSide != Side.FRONT && taskSide != Side.BACK)) {
                continue;
            }

            Side owner = roles.getOrDefault(task.assignee(), Side.NONE);

            if (owner != opposite(taskSide)) {
                continue;
            }

            Long better = lightestMember(taskSide, roles, load, context);

            if (better != null) {
                load.merge(task.assignee(), -1, Integer::sum);
                load.merge(better, 1, Integer::sum);
                tasks.set(index, task.withAssignee(better));
            }
        }
    }

    private static Side opposite(Side side) {
        return side == Side.FRONT ? Side.BACK : Side.FRONT;
    }

    // 그 쪽 일을 맡을 수 있는(그 쪽 또는 둘 다 하는) 멤버 중 작업이 가장 적은 사람이에요. 같으면 id가 작은 사람이에요.
    private static Long lightestMember(Side side, Map<Long, Side> roles, Map<Long, Integer> load, AiDraftContext context) {

        Long best = null;

        for (Long id : context.memberIds().stream().sorted().toList()) {

            Side role = roles.getOrDefault(id, Side.NONE);

            if (role != side && role != Side.BOTH) {
                continue;
            }

            if (best == null || load.getOrDefault(id, 0) < load.getOrDefault(best, 0)) {
                best = id;
            }
        }

        return best;
    }
}
