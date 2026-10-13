package com.flowspace.service.ai;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.flowspace.entity.enums.TaskPriority;

// 한 스프린트의 작업 우선순위를 서버가 정리해요.
// - HIGH는 작업의 30%까지만 둬요(작업이 적어도 1개는 허용). 모두 HIGH로 적는 모델의 습관을 막는 거예요.
// - 그 자리는 핵심 작업(인증·DB·배포 등)이 먼저 받고, 그다음 모델이 HIGH로 적은 작업을 앞 주차부터 받아요.
//   핵심 작업은 모델이 MEDIUM·LOW로 적었어도 자리가 있으면 HIGH로 올리고, 자리가 없어도 LOW로는 두지 않아요.
// - 자리를 못 받은 HIGH는 MEDIUM으로 낮춰요.
final class AiTaskPrioritizer {

    // 핵심 작업을 가리키는 낱말
    private static final List<String> CORE_WORDS = List.of("인증", "jwt", "로그인api", "회원가입api", "스키마", "db설계",
        "데이터베이스설계", "배포", "결제");

    // 이 낱말이 같이 있으면 화면·문서·테스트 작업이라서 핵심으로 보지 않아요(예: 로그인 페이지 UI).
    private static final List<String> NOT_CORE_WORDS = List.of("ui", "화면", "페이지", "폼", "디자인", "문서", "테스트");

    private AiTaskPrioritizer() {
    }

    // 주차 순으로 놓인 한 스프린트의 작업 목록을 제자리에서 고쳐요.
    static void apply(List<AiPlannedTask> tasks) {

        int limit = Math.max(1, tasks.size() * 3 / 10);

        List<Integer> candidates = new ArrayList<>();

        for (int index = 0; index < tasks.size(); index++) {
            if (isCore(tasks.get(index)) || tasks.get(index).priority() == TaskPriority.HIGH) {
                candidates.add(index);
            }
        }

        // 순위: 핵심이면서 HIGH → 핵심 → HIGH. 같은 순위끼리는 앞 번호가 먼저예요.
        candidates.sort(Comparator.comparingInt((Integer index) -> rank(tasks.get(index))).thenComparingInt(index -> index));

        Set<Integer> chosen = new HashSet<>(candidates.subList(0, Math.min(limit, candidates.size())));

        for (int index = 0; index < tasks.size(); index++) {
            tasks.set(index, tasks.get(index).withPriority(finalPriority(tasks.get(index), chosen.contains(index))));
        }
    }

    static boolean isCore(AiPlannedTask task) {

        if (AiKeywords.hasAny(task.title(), NOT_CORE_WORDS)) {
            return false;
        }

        return AiKeywords.hasAny(task.title(), CORE_WORDS);
    }

    private static int rank(AiPlannedTask task) {

        boolean core = isCore(task);
        boolean high = task.priority() == TaskPriority.HIGH;

        return core && high ? 0 : core ? 1 : 2;
    }

    private static TaskPriority finalPriority(AiPlannedTask task, boolean gotHigh) {

        if (gotHigh) {
            return TaskPriority.HIGH;
        }

        if (task.priority() == TaskPriority.HIGH || (task.priority() == TaskPriority.LOW && isCore(task))) {
            return TaskPriority.MEDIUM;
        }

        return task.priority();
    }
}
