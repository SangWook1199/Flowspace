package com.flowspace.service.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.flowspace.dto.ai.AiDraft;

// 한 스프린트의 작업에 날짜를 정해요. 모델은 "몇 번째 주, 며칠짜리"만 말하고, 날짜는 서버가 계산해요.
//
// 각 작업의 시작일은 "가장 빠른 시작일"이에요: 다음 세 가지 중 가장 늦은 평일.
//   1) 모델이 말한 주의 첫 평일
//   2) 같은 담당자의 앞 작업이 끝난 다음 평일(한 사람에게 같은 날 여러 작업이 몰리지 않게)
//   3) 먼저 끝나야 하는 작업(AiDependencyRules)이 끝난 다음 평일
// 다 놓은 뒤에는 같은 담당자의 작업 사이에 빈 평일을 AiGapFiller가 줄여요.
// 그렇게 놓으면 스프린트를 넘어갈 때는: 남은 평일이 작업 기간의 절반 이상이면 스프린트 끝에 맞춰 기간을 줄여 끼우고,
// 그보다 적으면 겹치더라도 원래 자리(1번)에 둬요.
final class AiScheduler {

    private AiScheduler() {
    }

    // 결과는 입력과 같은 순서예요.
    static List<AiDraft.Task> schedule(List<AiPlannedTask> tasks, LocalDate sprintStart, LocalDate sprintEnd) {
        return schedule(tasks, sprintStart, sprintEnd, true);
    }

    // fillGaps가 false면 담당자 작업 사이의 틈을 줄이지 않은 날짜예요. 멤버가 실제로 얼마나 일하는지 볼 때는 이 날짜로 봐요
    // (틈을 늘린 기간은 여유 기간이라서 일한 양으로 치지 않아요).
    static List<AiDraft.Task> schedule(List<AiPlannedTask> tasks, LocalDate sprintStart, LocalDate sprintEnd, boolean fillGaps) {

        LocalDate lastWorkday = AiWorkdays.onOrBefore(sprintEnd);
        List<List<Integer>> predecessors = AiDependencyRules.predecessors(tasks);

        Map<Long, LocalDate> assigneeFree = new HashMap<>();
        LocalDate[] from = new LocalDate[tasks.size()];
        LocalDate[] to = new LocalDate[tasks.size()];

        for (int index : AiDependencyRules.order(predecessors)) {

            AiPlannedTask task = tasks.get(index);

            LocalDate home = AiWorkdays.onOrAfter(sprintStart.plusDays((task.week() - 1) * 7L));

            if (home.isAfter(sprintEnd)) {
                home = sprintEnd;
            }

            LocalDate earliest = home;

            if (task.assignee() != null && assigneeFree.containsKey(task.assignee())) {
                earliest = later(earliest, assigneeFree.get(task.assignee()));
            }

            for (int before : predecessors.get(index)) {
                earliest = later(earliest, AiWorkdays.after(to[before]));
            }

            LocalDate start = home;
            LocalDate end = AiWorkdays.plus(home, task.days() - 1);

            if (earliest.isAfter(home) && !earliest.isAfter(lastWorkday)) {

                LocalDate stackedEnd = AiWorkdays.plus(earliest, task.days() - 1);

                if (!stackedEnd.isAfter(lastWorkday)) {
                    start = earliest;
                    end = stackedEnd;
                } else if (AiWorkdays.count(earliest, lastWorkday) * 2 >= task.days()) {
                    start = earliest;
                    end = lastWorkday;
                }
            }

            if (end.isAfter(sprintEnd)) {
                end = sprintEnd;
            }

            if (task.assignee() != null) {
                assigneeFree.merge(task.assignee(), AiWorkdays.after(end), AiScheduler::later);
            }

            from[index] = start;
            to[index] = end;
        }

        if (fillGaps) {
            AiGapFiller.fill(tasks, predecessors, from, to);
        }

        List<AiDraft.Task> result = new ArrayList<>();

        for (int index = 0; index < tasks.size(); index++) {
            AiPlannedTask task = tasks.get(index);

            result.add(new AiDraft.Task(task.title(), task.description(), task.priority(), task.assignee(), from[index], to[index]));
        }

        return result;
    }

    private static LocalDate later(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }
}
