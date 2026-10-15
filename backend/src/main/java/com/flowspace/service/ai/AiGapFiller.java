package com.flowspace.service.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.flowspace.dto.ai.AiDraftLimits;

// 같은 담당자의 작업과 작업 사이에 평일이 비면, 앞 작업의 끝을 늘려서 틈을 줄여요(여유 기간이에요).
// 다음 작업을 앞당기지 않는 이유: 앞당기면 틈이 스프린트 끝으로 옮겨 갈 뿐이고, 모델이 정한 주차 순서(설계 → 구현)가 깨질 수 있어요.
// 늘리는 양은 최대 MAX_EXTRA일이고, 한 작업이 MAX_TASK_DAYS일을 넘지 않게 해요. 이 작업이 끝나야 시작하는 작업(AiDependencyRules)이
// 있으면 그 시작일 전까지만 늘려요. 맨 마지막 작업은 늘리지 않아요(스프린트 끝의 여유로 둬요).
final class AiGapFiller {

    static final int MAX_EXTRA = 2;

    private AiGapFiller() {
    }

    // from/to는 작업과 같은 번호로 놓인 시작일·종료일이고, 제자리에서 to만 고쳐요.
    static void fill(List<AiPlannedTask> tasks, List<List<Integer>> predecessors, LocalDate[] from, LocalDate[] to) {

        Map<Long, List<Integer>> byAssignee = new LinkedHashMap<>();

        for (int index = 0; index < tasks.size(); index++) {
            if (tasks.get(index).assignee() != null) {
                byAssignee.computeIfAbsent(tasks.get(index).assignee(), id -> new ArrayList<>()).add(index);
            }
        }

        for (List<Integer> mine : byAssignee.values()) {

            mine.sort(Comparator.comparing((Integer index) -> from[index]).thenComparingInt(index -> index));

            for (int k = 0; k + 1 < mine.size(); k++) {
                extend(mine.get(k), mine.get(k + 1), predecessors, from, to);
            }
        }
    }

    private static void extend(int index, int next, List<List<Integer>> predecessors, LocalDate[] from, LocalDate[] to) {

        if (!to[index].isBefore(from[next])) {
            return;
        }

        LocalDate free = AiWorkdays.after(to[index]);

        if (!free.isBefore(from[next])) {
            return;
        }

        int gap = AiWorkdays.count(free, from[next].minusDays(1));
        int length = AiWorkdays.count(from[index], to[index]);
        int extra = Math.min(gap, Math.min(MAX_EXTRA, AiDraftLimits.MAX_TASK_DAYS - length));

        // 이 작업이 끝나야 시작하는 작업이 있으면 그 작업이 시작하기 전까지만 늘려요.
        for (int successor = 0; successor < predecessors.size(); successor++) {
            if (predecessors.get(successor).contains(index)) {
                while (extra > 0 && !AiWorkdays.plus(to[index], extra).isBefore(from[successor])) {
                    extra--;
                }
            }
        }

        if (extra > 0) {
            to[index] = AiWorkdays.plus(to[index], extra);
        }
    }
}
