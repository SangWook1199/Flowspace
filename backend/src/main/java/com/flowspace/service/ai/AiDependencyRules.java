package com.flowspace.service.ai;

import java.util.ArrayList;
import java.util.List;

// 같은 스프린트 안에서 "이게 끝나야 시작할 수 있는" 작업의 순서 규칙이에요.
// 모델이 같은 주에 두면 날짜가 겹쳐서 "환경도 없는데 배포"처럼 되니까, 서버가 앞 작업이 끝난 다음으로 미뤄요.
// (같은 스프린트 안만 봐요. 앞 스프린트의 작업은 이미 끝난 것으로 봐요.)
final class AiDependencyRules {

    // before에 걸리는 작업이 모두 끝난 뒤에 after에 걸리는 작업을 시작해요. 한 제목이 양쪽에 다 걸리면 before로만 봐요.
    record Rule(List<String> before, List<String> after) {
    }

    static final List<Rule> RULES = List.of(
        // 배포 준비 → 실제 배포
        new Rule(List.of("배포환경", "배포설정", "배포준비", "ci/cd", "cicd", "인프라", "서버환경", "서버구축"),
            List.of("최종배포", "운영배포", "서비스배포", "릴리스", "배포및")),
        // 테스트 → 실제 배포
        new Rule(List.of("통합테스트", "e2e", "qa", "버그수정"), List.of("최종배포", "운영배포", "서비스배포", "릴리스")));

    private AiDependencyRules() {
    }

    // 작업마다 "먼저 끝나야 하는 작업"의 번호 목록이에요.
    static List<List<Integer>> predecessors(List<AiPlannedTask> tasks) {

        List<List<Integer>> result = new ArrayList<>();

        for (int index = 0; index < tasks.size(); index++) {
            result.add(new ArrayList<>());
        }

        for (Rule rule : RULES) {
            for (int later = 0; later < tasks.size(); later++) {

                String laterTitle = tasks.get(later).title();

                if (!AiKeywords.hasAny(laterTitle, rule.after()) || AiKeywords.hasAny(laterTitle, rule.before())) {
                    continue;
                }

                for (int earlier = 0; earlier < tasks.size(); earlier++) {
                    if (earlier != later && AiKeywords.hasAny(tasks.get(earlier).title(), rule.before())
                        && !result.get(later).contains(earlier)) {
                        result.get(later).add(earlier);
                    }
                }
            }
        }

        return result;
    }

    // 앞 작업이 먼저 오도록 놓은 순서예요. 규칙에 걸리지 않는 작업은 원래 순서를 지켜요.
    static List<Integer> order(List<List<Integer>> predecessors) {

        int size = predecessors.size();
        boolean[] placed = new boolean[size];
        List<Integer> order = new ArrayList<>();

        while (order.size() < size) {

            int next = -1;

            for (int index = 0; index < size && next < 0; index++) {
                if (!placed[index] && predecessors.get(index).stream().allMatch(before -> placed[before])) {
                    next = index;
                }
            }

            // 서로 기다리는 경우(규칙상 생기지 않지만)에는 원래 순서대로 풀어요.
            if (next < 0) {
                for (int index = 0; index < size && next < 0; index++) {
                    if (!placed[index]) {
                        next = index;
                    }
                }
            }

            placed[next] = true;
            order.add(next);
        }

        return order;
    }
}
