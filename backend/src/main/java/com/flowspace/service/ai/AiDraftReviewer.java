package com.flowspace.service.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;

// 서버가 직접 고칠 수 없지만 눈에 띄는 흠을 찾아서, 있으면 AiDraftException으로 모델에게 다시 만들게 해요.
// 흠을 한 번에 모두 모아서 알려 줘요(하나씩 알려 주면 다시 만들 때마다 또 걸려서 오래 걸려요).
//   - 정해진 일정(예: 중간 발표)의 준비 작업이 그 날짜보다 늦음
//   - 사용자가 요청하지 않은 기능(내 정보, 알림, 관리자 화면 등)
//   - "A 또는 B"처럼 하나로 정하지 않은 말
//   - 화면 작업만 있고 짝이 되는 API 작업이 없는(또는 그 반대인) 기능(검색, 채팅 등)
//   - 작업이 충분한데도 일이 거의 없거나 한 주를 통째로 쉬는 멤버
// 마지막 시도에서는 부르지 않아서, 이런 흠만으로 초안을 통째로 버리지 않아요(미리보기에서 고칠 수 있어요).
final class AiDraftReviewer {

    // 이 낱말이 제목에 있으면 정해진 일정 "뒤"에 하는 작업(회고, 피드백 등)이라서 준비 작업으로 보지 않아요.
    private static final List<String> AFTER_WORDS = List.of("이후", "후속", "회고", "피드백", "반영", "결과", "사후", " 후");

    // 이 낱말이 제목에 있는데 사용자가 쓴 글에는 없으면 "요청하지 않은 기능"으로 봐요(띄어쓰기는 무시해요).
    private static final List<String> UNREQUESTED = List.of("내정보", "마이페이지", "알림", "관리자화면", "관리자페이지", "채팅", "찜", "후기", "쪽지", "쿠폰");

    // 화면과 API가 짝으로 있어야 하는 기능이에요(로그인처럼 한 작업에 같이 쓰기 쉬운 것은 넣지 않았어요).
    private static final List<String> PAIRED_FEATURES = List.of("검색", "채팅", "마이페이지", "결제", "알림");

    // "A 또는 B"(괄호 안의 "(또는 B)" 포함)
    private static final Pattern HEDGE = Pattern.compile("(^|[\\s(])또는(\\s|$)");

    // 한 번에 알려 주는 흠의 최대 개수(질문이 너무 길어지지 않게)
    private static final int MAX_PROBLEMS = 4;

    private AiDraftReviewer() {
    }

    static void review(List<AiDraft.Sprint> sprints, AiDraftContext context, String requestText) {

        List<String> problems = new ArrayList<>();

        findLatePreparation(sprints, context, problems);
        findUnrequested(sprints, requestText, problems);
        findHedging(sprints, problems);
        findUnpaired(sprints, context, problems);
        findIdleMembers(sprints, context, problems);

        if (!problems.isEmpty()) {
            throw new AiDraftException(String.join(" ", problems));
        }
    }

    // 제목에 정해진 일정 이름(예: "중간 발표")이 들어 있는 작업은 그 일정 날짜 전에 끝나야 해요.
    private static void findLatePreparation(List<AiDraft.Sprint> sprints, AiDraftContext context, List<String> problems) {

        for (AiDraftContext.FixedEvent fixed : context.fixedEvents()) {

            if (fixed == null || fixed.date() == null || fixed.title() == null) {
                continue;
            }

            String key = fixed.title().replaceAll("\\s+", "");

            if (key.length() < 2) {
                continue;
            }

            for (AiDraft.Sprint sprint : sprints) {
                for (AiDraft.Task task : sprint.tasks()) {

                    String title = task.title();

                    if (!title.replaceAll("\\s+", "").contains(key) || isAfterWork(title)
                        || !task.endDate().isAfter(fixed.date())) {
                        continue;
                    }

                    problems.add("'" + task.title() + "' 작업이 '" + fixed.title() + "' 일정(" + fixed.date()
                        + ")보다 늦어요. '" + fixed.title() + "' 준비 작업은 " + fixed.date()
                        + " 전에 끝나게 앞쪽 스프린트에 둬 주세요.");
                    return;
                }
            }
        }
    }

    // 사용자가 쓰지 않은 기능을 작업 제목에 넣었는지 봐요.
    private static void findUnrequested(List<AiDraft.Sprint> sprints, String requestText, List<String> problems) {

        String requested = AiKeywords.squash(requestText);

        for (AiDraft.Sprint sprint : sprints) {
            for (AiDraft.Task task : sprint.tasks()) {
                for (String word : UNREQUESTED) {
                    if (AiKeywords.hasAny(task.title(), List.of(word)) && !requested.contains(word)) {
                        problems.add("'" + task.title() + "' 작업은 사용자가 요청하지 않은 기능이에요. 핵심 기능에 적힌 것만 만들고 이 작업은 빼 주세요.");
                        return;
                    }
                }
            }
        }
    }

    // "A 또는 B"처럼 하나로 정하지 않은 말이 제목·설명에 있는지 봐요.
    private static void findHedging(List<AiDraft.Sprint> sprints, List<String> problems) {

        for (AiDraft.Sprint sprint : sprints) {
            for (AiDraft.Task task : sprint.tasks()) {

                if (hasHedge(task.title()) || hasHedge(task.description())) {
                    problems.add("'" + task.title() + "' 작업에 'A 또는 B'처럼 정하지 않은 말이 있어요. 하나로 정해서 써 주세요.");
                    return;
                }
            }
        }
    }

    // 프런트 멤버와 백엔드 멤버가 모두 있을 때, 한 기능(검색 등)의 작업이 화면 쪽에만 있거나 API 쪽에만 있으면 알려요.
    // 작업이 어느 쪽인지는 제목으로 보고, 제목으로 알 수 없으면 담당자의 역할로 봐요.
    private static void findUnpaired(List<AiDraft.Sprint> sprints, AiDraftContext context, List<String> problems) {

        java.util.Collection<String> roles = context.memberRoles().values();

        boolean hasFront = roles.stream().anyMatch(role -> AiRoleAssigner.sideOfRole(role) == AiRoleAssigner.Side.FRONT);
        boolean hasBack = roles.stream().anyMatch(role -> AiRoleAssigner.sideOfRole(role) == AiRoleAssigner.Side.BACK);

        if (!hasFront || !hasBack) {
            return;
        }

        for (String feature : PAIRED_FEATURES) {

            Set<AiRoleAssigner.Side> sides = EnumSet.noneOf(AiRoleAssigner.Side.class);
            String example = null;

            for (AiDraft.Sprint sprint : sprints) {
                for (AiDraft.Task task : sprint.tasks()) {

                    if (!AiKeywords.hasAny(task.title(), List.of(feature))) {
                        continue;
                    }

                    AiRoleAssigner.Side side = AiRoleAssigner.sideOfTask(task.title());

                    if (side == AiRoleAssigner.Side.NONE && task.assigneeUserId() != null) {
                        side = AiRoleAssigner.sideOfRole(context.memberRoles().get(task.assigneeUserId()));
                    }

                    if (side == AiRoleAssigner.Side.BOTH) {
                        sides.add(AiRoleAssigner.Side.FRONT);
                        sides.add(AiRoleAssigner.Side.BACK);
                    } else if (side != AiRoleAssigner.Side.NONE) {
                        sides.add(side);
                    }

                    if (example == null) {
                        example = task.title();
                    }
                }
            }

            if (sides.size() == 1 && problems.size() < MAX_PROBLEMS) {
                boolean frontOnly = sides.contains(AiRoleAssigner.Side.FRONT);

                problems.add("'" + example + "'처럼 '" + feature + "' 기능이 " + (frontOnly ? "화면" : "API") + " 작업뿐이에요. 짝이 되는 "
                    + (frontOnly ? "API(서버)" : "화면") + " 작업도 만들어 주세요.");
            }
        }
    }

    // 작업이 멤버 수 × 주 수 이상이라 나눌 만한데도, 어떤 멤버가 스프린트 평일의 40% 미만만 일하거나
    // 한 주를 통째로 쉬면 알려요. 작업이 그보다 적으면 나눌 수가 없어서 보지 않아요.
    private static void findIdleMembers(List<AiDraft.Sprint> sprints, AiDraftContext context, List<String> problems) {

        int members = context.memberIds().size();

        if (members < 2) {
            return;
        }

        List<Long> memberIds = context.memberIds().stream().sorted().toList();

        for (int index = 0; index < sprints.size() && problems.size() < MAX_PROBLEMS; index++) {

            AiDraft.Sprint sprint = sprints.get(index);
            int weeks = context.weeksOf(index);
            int workdays = AiWorkdays.count(sprint.startDate(), sprint.endDate());

            if (sprint.tasks().size() < members * weeks || workdays < 3) {
                continue;
            }

            for (Long memberId : memberIds) {

                String reason = idleReason(sprint, weeks, workdays, busyDays(sprint, memberId));

                if (reason != null && problems.size() < MAX_PROBLEMS) {
                    problems.add("id " + memberId + " 멤버가 스프린트 " + (index + 1) + "(" + sprint.startDate() + " ~ "
                        + sprint.endDate() + ")에서 " + reason + " 이 멤버의 역할에 맞는 작업을 더 맡겨서 스프린트 내내(모든 주에) 일이 이어지게 해 주세요.");
                }
            }
        }
    }

    // 그 멤버가 작업을 하는 평일들
    private static Set<LocalDate> busyDays(AiDraft.Sprint sprint, Long memberId) {

        Set<LocalDate> busy = new HashSet<>();

        for (AiDraft.Task task : sprint.tasks()) {
            if (memberId.equals(task.assigneeUserId())) {
                for (LocalDate day = task.startDate(); !day.isAfter(task.endDate()); day = day.plusDays(1)) {
                    if (AiWorkdays.isWorkday(day)) {
                        busy.add(day);
                    }
                }
            }
        }

        return busy;
    }

    // 일이 너무 적거나 한 주가 통째로 비면 그 이유 문장을, 아니면 null을 돌려줘요.
    private static String idleReason(AiDraft.Sprint sprint, int weeks, int workdays, Set<LocalDate> busy) {

        if (busy.size() * 10 < workdays * 4) {
            return "평일 " + workdays + "일 중 " + busy.size() + "일만 일해요.";
        }

        for (int week = 0; week < weeks; week++) {

            LocalDate from = sprint.startDate().plusDays(week * 7L);
            LocalDate to = from.plusDays(6).isAfter(sprint.endDate()) ? sprint.endDate() : from.plusDays(6);

            // 끝에 남은 짧은 주(평일 2일 이하)는 보지 않아요.
            if (AiWorkdays.count(from, to) < 3) {
                continue;
            }

            if (busy.stream().noneMatch(day -> !day.isBefore(from) && !day.isAfter(to))) {
                return (week + 1) + "번째 주에는 맡은 작업이 없어요.";
            }
        }

        return null;
    }

    private static boolean hasHedge(String text) {
        return text != null && HEDGE.matcher(text).find();
    }

    private static boolean isAfterWork(String title) {

        for (String word : AFTER_WORDS) {
            if (title.contains(word)) {
                return true;
            }
        }

        return false;
    }
}
