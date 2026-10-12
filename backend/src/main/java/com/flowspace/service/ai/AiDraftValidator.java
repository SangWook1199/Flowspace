package com.flowspace.service.ai;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiDraftLimits;
import com.flowspace.dto.ai.AiRawDraft;
import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 모델이 만든 초안은 믿지 않아요. 여기서 고칠 수 있는 값은 고치고(우선순위, 주차, 담당자, 이름 번호 등),
// 고칠 수 없을 만큼 틀린 것(스프린트가 모자람, 작업이 없음)은 AiDraftException으로 돌려보내 다시 만들게 해요.
// 날짜도 모델이 아니라 여기서 기간과 주차로 계산해요.
@Component
public class AiDraftValidator {

    // "스프린트 1:", "Sprint 2 -" 같은 번호 접두사(화면이 이미 순서를 보여줘서 이름에는 필요 없어요)
    private static final Pattern SPRINT_PREFIX = Pattern.compile(
        "^\\s*(?:스프린트|sprint)\\s*\\d+\\s*(?:[:：.)\\-–—]\\s*)?", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // 모델이 가끔 한국어 문장 중간에 중국어(한자)나 일본어를 섞어 써요. 이런 글자가 나오면 다시 만들게 해요.
    private static final Pattern FOREIGN_SCRIPT = Pattern.compile("[\\p{IsHan}\\p{IsHiragana}\\p{IsKatakana}]+");

    // 한글 낱말 뒤에 붙은 '와/과'(낱말 끝에서만)
    private static final Pattern PARTICLE = Pattern.compile("([가-힣]+)(과|와)(?=[\\s,.)]|$)");

    // 받침이 없는 글자 뒤에 오지만 조사가 아니라 낱말의 일부인 '과'
    private static final List<String> GWA_NOUNS = List.of("효과", "사과", "교과", "외과", "내과", "부과", "초과", "인과", "대과",
        "전과", "약과", "이과", "문과", "치과", "소아과", "피부과", "총무과", "인사과", "재무과");

    // "A 또는 B"(괄호 안의 "(또는 B)" 포함)
    private static final Pattern HEDGE = Pattern.compile("(^|[\\s(])또는(\\s|$)");

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern LEADING_MARK = Pattern.compile("^[#>*\\-\\s]+");
    private static final Pattern SPACES = Pattern.compile("[\\p{Cntrl}\\s]+");
    private static final Pattern LINE_SPACES = Pattern.compile("[\\p{Cntrl}\\s&&[^\\n]]+");

    // 모델이 만든 초안 → 검증·보정·날짜 계산을 마친 초안
    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context) {
        return toDraft(raw, context, true, "");
    }

    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context, boolean strict) {
        return toDraft(raw, context, strict, "");
    }

    // strict가 true면 "고칠 수는 없지만 눈에 띄는 흠"(정해진 일정보다 늦은 준비 작업, 요청하지 않은 기능,
    // "A 또는 B" 얼버무림)도 다시 만들게 해요. 마지막 시도에서는 false로 불러서 이런 흠만으로 초안을 통째로
    // 버리지 않게 해요(미리보기에서 고칠 수 있어요). requestText는 사용자가 쓴 주제·핵심 기능 등이에요
    // (여기 적힌 기능은 "요청한 기능"으로 봐요).
    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context, boolean strict, String requestText) {

        List<AiRawDraft.Sprint> rawSprints = raw == null || raw.sprints() == null ? List.of()
            : raw.sprints().stream().filter(Objects::nonNull).toList();

        int expected = context.sprintCount();

        if (rawSprints.isEmpty()) {
            throw new AiDraftException("sprints가 비어 있어요. 스프린트를 정확히 " + expected + "개 만들어 주세요.");
        }

        if (rawSprints.size() < expected) {
            throw new AiDraftException(
                "스프린트가 " + rawSprints.size() + "개뿐이에요. 정확히 " + expected + "개를 만들어 주세요.");
        }

        rejectForeignScript(rawSprints.subList(0, expected));

        // 더 많이 만들었으면 앞의 expected개만 써요.
        List<AiDraft.Sprint> sprints = new ArrayList<>();

        for (int index = 0; index < expected; index++) {
            sprints.add(toSprint(rawSprints.get(index), index, context));
        }

        if (strict) {
            rejectBlemishes(sprints, context, requestText);
        }

        return new AiDraft(sprints, toEvents(context));
    }

    // 모델이 만든 글(스프린트·작업)에 한자·일본어가 섞였는지 봐요. 사용자가 직접 쓴 고정 일정은 보지 않아요.
    private void rejectForeignScript(List<AiRawDraft.Sprint> sprints) {

        List<String> texts = new ArrayList<>();

        for (AiRawDraft.Sprint sprint : sprints) {
            texts.add(sprint.name());
            texts.add(sprint.goal());

            if (sprint.tasks() != null) {
                for (AiRawDraft.Task task : sprint.tasks()) {
                    if (task != null) {
                        texts.add(task.title());
                        texts.add(task.description());
                    }
                }
            }
        }

        for (String text : texts) {

            if (text == null) {
                continue;
            }

            Matcher matcher = FOREIGN_SCRIPT.matcher(text);

            if (matcher.find()) {
                throw new AiDraftException("한자나 일본어 글자('" + matcher.group() + "')가 섞여 있어요. 모든 글을 한글로만 써 주세요.");
            }
        }
    }

    // 사용자가 고친 최종본을 저장하기 전에 한 번 더 확인해요(미리보기는 브라우저에서 고쳤으니 서버는 믿지 않아요).
    public void validateForApply(AiDraft draft, Set<Long> memberIds) {

        if (draft == null || draft.sprints() == null || draft.sprints().isEmpty()
            || draft.sprints().size() > AiDraftLimits.MAX_SPRINTS) {
            throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
        }

        List<AiDraft.Event> events = draft.events() == null ? List.of() : draft.events();

        if (events.size() > AiDraftLimits.MAX_EVENTS) {
            throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
        }

        for (AiDraft.Sprint sprint : draft.sprints()) {

            if (sprint == null || isBlank(sprint.name()) || sprint.tasks() == null
                || sprint.tasks().size() > AiDraftLimits.MAX_TASKS_PER_SPRINT) {
                throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
            }

            if (sprint.startDate() == null || sprint.endDate() == null || sprint.endDate().isBefore(sprint.startDate())) {
                throw new FlowSpaceException(ErrorCode.INVALID_SPRINT_DATE);
            }

            for (AiDraft.Task task : sprint.tasks()) {

                if (task == null || isBlank(task.title()) || task.priority() == null || task.startDate() == null
                    || task.endDate() == null || task.endDate().isBefore(task.startDate())) {
                    throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
                }

                // 담당자는 이 워크스페이스 멤버만 될 수 있어요.
                if (task.assigneeUserId() != null && !memberIds.contains(task.assigneeUserId())) {
                    throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
                }
            }
        }

        for (AiDraft.Event event : events) {

            if (event == null || isBlank(event.title()) || event.date() == null) {
                throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
            }
        }
    }

    // ---------- 스프린트·작업 ----------

    // 날짜를 정하기 전의 작업이에요.
    private record Planned(String title, String description, TaskPriority priority, Long assignee, int week, int days) {
    }

    private AiDraft.Sprint toSprint(AiRawDraft.Sprint raw, int index, AiDraftContext context) {

        LocalDate start = context.sprintStart(index);
        LocalDate end = context.sprintEnd(index);
        int weeks = context.weeksOf(index);

        List<Planned> planned = new ArrayList<>();

        if (raw.tasks() != null) {
            for (AiRawDraft.Task task : raw.tasks()) {

                if (task == null || planned.size() >= AiDraftLimits.MAX_TASKS_PER_SPRINT) {
                    continue;
                }

                Planned converted = plan(task, weeks, context);

                if (converted != null) {
                    planned.add(converted);
                }
            }
        }

        if (planned.isEmpty()) {
            throw new AiDraftException((index + 1) + "번째 스프린트에 작업이 없어요. 스프린트마다 작업을 만들어 주세요.");
        }

        // 주차 순으로 놓아요(같은 주 안에서는 모델이 쓴 순서 그대로).
        planned.sort(Comparator.comparingInt(Planned::week));
        capHigh(planned);

        String goal = fixParticles(clean(raw.goal(), AiDraftLimits.MAX_GOAL));

        return new AiDraft.Sprint(cleanName(raw.name(), index + 1), goal.isEmpty() ? null : goal, start, end,
            schedule(planned, start, end));
    }

    // 제목이 비어 있으면 버려요(null). 주차·기간은 범위 안으로, 담당자는 멤버가 아니면 비워요.
    private Planned plan(AiRawDraft.Task raw, int weeks, AiDraftContext context) {

        String title = fixParticles(clean(raw.title(), AiDraftLimits.MAX_TITLE));

        if (title.isEmpty()) {
            return null;
        }

        Long assignee = raw.assigneeUserId() != null && context.memberIds().contains(raw.assigneeUserId())
            ? raw.assigneeUserId()
            : null;

        return new Planned(title, fixParticles(cleanDescription(raw.description())), parsePriority(raw.priority()),
            assignee, clamp(raw.weekInSprint(), 1, weeks), clamp(raw.durationDays(), 1, AiDraftLimits.MAX_TASK_DAYS));
    }

    // HIGH는 스프린트 작업의 30%까지만 둬요(작업이 적어도 1개는 허용). 넘치면 뒤에 있는 HIGH부터 MEDIUM으로 낮춰요.
    // 모두 HIGH로 적는 모델의 습관을 서버가 막는 거예요.
    private void capHigh(List<Planned> planned) {

        int limit = Math.max(1, planned.size() * 3 / 10);
        int high = 0;

        for (int index = 0; index < planned.size(); index++) {

            Planned task = planned.get(index);

            if (task.priority() != TaskPriority.HIGH) {
                continue;
            }

            high++;

            if (high > limit) {
                planned.set(index, new Planned(task.title(), task.description(), TaskPriority.MEDIUM, task.assignee(),
                    task.week(), task.days()));
            }
        }
    }

    // 모델이 준 주차를 가장 빠른 시작일로 보고, 같은 담당자의 작업은 앞 작업이 끝난 다음 평일부터 이어 붙여요.
    // 한 사람에게 같은 날 여러 작업이 몰리지 않게 하려는 거예요. 이어 붙이면 스프린트를 넘어가면,
    // 남은 평일이 기간의 절반 이상일 때는 스프린트 끝에 맞춰 기간을 줄여 끼우고, 그보다 적으면
    // 겹치더라도 원래 자리(주차의 첫 평일)에 둬요.
    private List<AiDraft.Task> schedule(List<Planned> planned, LocalDate sprintStart, LocalDate sprintEnd) {

        LocalDate lastWorkday = lastWorkdayOnOrBefore(sprintEnd);
        Map<Long, LocalDate> nextFree = new HashMap<>();
        List<AiDraft.Task> tasks = new ArrayList<>();

        for (Planned task : planned) {

            LocalDate from = firstWorkday(sprintStart.plusDays((task.week() - 1) * 7L));

            if (from.isAfter(sprintEnd)) {
                from = sprintEnd;
            }

            LocalDate to = addWorkdays(from, task.days() - 1);

            if (task.assignee() != null) {
                LocalDate free = nextFree.get(task.assignee());

                if (free != null && free.isAfter(from) && !free.isAfter(lastWorkday)) {
                    LocalDate stackedEnd = addWorkdays(free, task.days() - 1);

                    if (!stackedEnd.isAfter(lastWorkday)) {
                        from = free;
                        to = stackedEnd;
                    } else if (countWorkdays(free, lastWorkday) * 2 >= task.days()) {
                        from = free;
                        to = lastWorkday;
                    }
                }
            }

            if (to.isAfter(sprintEnd)) {
                to = sprintEnd;
            }

            if (task.assignee() != null) {
                nextFree.merge(task.assignee(), nextWorkday(to), (a, b) -> a.isAfter(b) ? a : b);
            }

            tasks.add(new AiDraft.Task(task.title(), task.description(), task.priority(), task.assignee(), from, to));
        }

        return tasks;
    }

    // ---------- 정해진 일정과 준비 작업 ----------

    // 이 낱말이 제목에 있으면 정해진 일정 "뒤"에 하는 작업(회고, 피드백 등)이라서 준비 작업으로 보지 않아요.
    private static final List<String> AFTER_WORDS = List.of("이후", "후속", "회고", "피드백", "반영", "결과", "사후", " 후");

    // 이 낱말이 제목에 있는데 사용자가 쓴 글에는 없으면 "요청하지 않은 기능"으로 봐요(띄어쓰기는 무시해요).
    private static final List<String> UNREQUESTED = List.of("내정보", "마이페이지", "알림", "관리자화면", "관리자페이지");

    // 흠을 모두 모아서 한 번에 알려줘요(한 가지씩 알려주면 다시 만들 때마다 또 걸려서 오래 걸려요).
    private void rejectBlemishes(List<AiDraft.Sprint> sprints, AiDraftContext context, String requestText) {

        List<String> problems = new ArrayList<>();

        findLatePreparation(sprints, context, problems);
        findUnrequested(sprints, requestText, problems);
        findHedging(sprints, problems);

        if (!problems.isEmpty()) {
            throw new AiDraftException(String.join(" ", problems));
        }
    }

    // 제목에 정해진 일정 이름(예: "중간 발표")이 들어 있는 작업은 그 일정 날짜 전에 끝나야 해요.
    // 일정이 11/13인데 "중간 발표 자료 준비"가 11/26이면 다시 만들게 해요.
    private void findLatePreparation(List<AiDraft.Sprint> sprints, AiDraftContext context, List<String> problems) {

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

    // 사용자가 쓰지 않은 기능(내 정보, 알림, 관리자 화면 등)을 작업 제목에 넣었는지 봐요.
    private void findUnrequested(List<AiDraft.Sprint> sprints, String requestText, List<String> problems) {

        String requested = requestText == null ? "" : requestText.replaceAll("\\s+", "");

        for (AiDraft.Sprint sprint : sprints) {
            for (AiDraft.Task task : sprint.tasks()) {

                String title = task.title().replaceAll("\\s+", "");

                for (String word : UNREQUESTED) {
                    if (title.contains(word) && !requested.contains(word)) {
                        problems.add("'" + task.title() + "' 작업은 사용자가 요청하지 않은 기능이에요. 핵심 기능에 적힌 것만 만들고 이 작업은 빼 주세요.");
                        return;
                    }
                }
            }
        }
    }

    // "A 또는 B"처럼 하나로 정하지 않은 말이 제목·설명에 있는지 봐요. 하나로 정해서 쓰게 해요.
    private void findHedging(List<AiDraft.Sprint> sprints, List<String> problems) {

        for (AiDraft.Sprint sprint : sprints) {
            for (AiDraft.Task task : sprint.tasks()) {

                if (hasHedge(task.title()) || hasHedge(task.description())) {
                    problems.add("'" + task.title() + "' 작업에 'A 또는 B'처럼 정하지 않은 말이 있어요. 하나로 정해서 써 주세요.");
                    return;
                }
            }
        }
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

    // ---------- 이벤트 ----------

    // 이벤트는 모델이 아니라 서버가 만들어요(모델이 없는 일정을 지어내기 때문이에요).
    // 사용자가 정한 고정 일정을 먼저 넣고, 스프린트마다 마지막 평일에 "스프린트 N 리뷰"를 더해요(같은 제목·날짜는 한 번만).
    private List<AiDraft.Event> toEvents(AiDraftContext context) {

        Map<String, AiDraft.Event> unique = new LinkedHashMap<>();

        for (AiDraftContext.FixedEvent fixed : context.fixedEvents()) {

            if (unique.size() >= AiDraftLimits.MAX_EVENTS) {
                break;
            }

            if (fixed == null || fixed.date() == null || fixed.date().isBefore(context.startDate())
                || fixed.date().isAfter(context.endDate())) {
                continue;
            }

            addEvent(unique, clean(fixed.title(), AiDraftLimits.MAX_TITLE), fixed.date());
        }

        for (int index = 0; index < context.sprintCount() && unique.size() < AiDraftLimits.MAX_EVENTS; index++) {

            LocalDate date = lastWorkdayOnOrBefore(context.sprintEnd(index));

            if (date.isBefore(context.sprintStart(index))) {
                date = context.sprintStart(index);
            }

            addEvent(unique, "스프린트 " + (index + 1) + " 리뷰", date);
        }

        List<AiDraft.Event> events = new ArrayList<>(unique.values());
        events.sort(Comparator.comparing(AiDraft.Event::date).thenComparing(AiDraft.Event::title));

        return events;
    }

    private void addEvent(Map<String, AiDraft.Event> unique, String title, LocalDate date) {

        if (title.isEmpty()) {
            return;
        }

        unique.putIfAbsent(title + "|" + date, new AiDraft.Event(title, date));
    }

    // ---------- 값 보정 ----------

    private static TaskPriority parsePriority(String value) {

        if (value == null) {
            return TaskPriority.MEDIUM;
        }

        try {
            return TaskPriority.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return TaskPriority.MEDIUM;
        }
    }

    private static int clamp(Integer value, int min, int max) {

        if (value == null) {
            return min;
        }

        return Math.max(min, Math.min(max, value));
    }

    // 토·일이면 다음 월요일로 넘겨요.
    private static LocalDate firstWorkday(LocalDate date) {

        return switch (date.getDayOfWeek()) {
            case SATURDAY -> date.plusDays(2);
            case SUNDAY -> date.plusDays(1);
            default -> date;
        };
    }

    // 날짜가 주말이면 그 앞 금요일로 돌려요.
    private static LocalDate lastWorkdayOnOrBefore(LocalDate date) {

        return switch (date.getDayOfWeek()) {
            case SATURDAY -> date.minusDays(1);
            case SUNDAY -> date.minusDays(2);
            default -> date;
        };
    }

    // 다음 날 이후 첫 평일이에요.
    private static LocalDate nextWorkday(LocalDate date) {
        return firstWorkday(date.plusDays(1));
    }

    // from부터 to까지(둘 다 포함) 평일이 며칠인지 세요.
    private static int countWorkdays(LocalDate from, LocalDate to) {

        int count = 0;

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY) {
                count++;
            }
        }

        return count;
    }

    // 주말을 건너뛰고 평일 기준으로 days일 뒤 날짜를 구해요.
    private static LocalDate addWorkdays(LocalDate date, int days) {

        LocalDate result = date;
        int remaining = days;

        while (remaining > 0) {
            result = result.plusDays(1);

            if (result.getDayOfWeek() != DayOfWeek.SATURDAY && result.getDayOfWeek() != DayOfWeek.SUNDAY) {
                remaining--;
            }
        }

        return result;
    }

    // ---------- 글자 정리(평문화) ----------

    private static String cleanName(String raw, int number) {

        // 번호 접두사를 떼고 나서 길이를 맞춰야 이름이 잘리지 않아요.
        String name = SPRINT_PREFIX.matcher(clean(raw, AiDraftLimits.MAX_SPRINT_NAME + 20)).replaceFirst("").strip();
        name = fixParticles(truncate(name, AiDraftLimits.MAX_SPRINT_NAME));

        return name.isEmpty() ? "스프린트 " + number : name;
    }

    // 받침에 맞지 않는 '와/과'를 고쳐요(예: "관리과 검색" → "관리와 검색"). 받침이 없으면 '와', 있으면 '과'예요.
    // "효과"처럼 '과'로 끝나는 낱말은 건드리지 않아요.
    static String fixParticles(String text) {

        if (text == null) {
            return null;
        }

        Matcher matcher = PARTICLE.matcher(text);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {

            String word = matcher.group(1);
            String particle = matcher.group(2);
            char last = word.charAt(word.length() - 1);
            boolean hasFinalConsonant = (last - 0xAC00) % 28 != 0;

            String fixed = particle;

            if (particle.equals("와") && hasFinalConsonant) {
                fixed = "과";
            } else if (particle.equals("과") && !hasFinalConsonant && !endsWithNounGwa(word + particle)) {
                fixed = "와";
            }

            matcher.appendReplacement(result, Matcher.quoteReplacement(word + fixed));
        }

        matcher.appendTail(result);

        return result.toString();
    }

    private static boolean endsWithNounGwa(String token) {

        for (String noun : GWA_NOUNS) {
            if (token.endsWith(noun)) {
                return true;
            }
        }

        return false;
    }

    // 한 줄 글: HTML 태그·마크다운 기호·제어문자를 지우고 공백을 하나로 모아요.
    static String clean(String value, int max) {

        if (value == null) {
            return "";
        }

        String text = removeMarkup(value);
        text = SPACES.matcher(text).replaceAll(" ").strip();
        text = LEADING_MARK.matcher(text).replaceFirst("").strip();

        return truncate(text, max);
    }

    // 설명은 줄바꿈을 살리고 빈 줄은 없애요. 비어 있으면 null이에요.
    static String cleanDescription(String value) {

        if (value == null) {
            return null;
        }

        String text = removeMarkup(value).replace("\r\n", "\n").replace('\r', '\n');
        List<String> lines = new ArrayList<>();

        for (String line : text.split("\n")) {
            String stripped = LINE_SPACES.matcher(line).replaceAll(" ").strip();

            if (!stripped.isEmpty()) {
                lines.add(stripped);
            }
        }

        String joined = truncate(String.join("\n", lines), AiDraftLimits.MAX_DESCRIPTION);

        return joined.isEmpty() ? null : joined;
    }

    private static String removeMarkup(String value) {
        return HTML_TAG.matcher(value).replaceAll(" ").replace("`", "").replace("**", "").replace("__", "");
    }

    // 글자(코드포인트) 기준으로 자르고 뒤 공백은 지워요.
    private static String truncate(String text, int max) {

        if (text.codePointCount(0, text.length()) <= max) {
            return text;
        }

        return text.substring(0, text.offsetByCodePoints(0, max)).strip();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
