package com.flowspace.service.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiDraftLimits;
import com.flowspace.dto.ai.AiRawDraft;
import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 모델이 만든 초안은 믿지 않아요. 이 클래스는 초안을 믿을 수 있는 모양으로 바꾸는 순서만 맡고,
// 각 단계의 규칙은 전담 클래스가 가지고 있어요.
//
//   모델 초안(AiRawDraft)
//     1. 개수 확인        스프린트가 모자라거나 작업이 없으면 AiDraftException(다시 만들게 해요)
//     2. 글 확인·정리      한자·일본어 제거, 마크다운 제거, 조사 교정          → AiText
//     3. 작업 다듬기       주차 순 정렬 → 역할에 맞는 담당자 → 우선순위       → AiRoleAssigner, AiTaskPrioritizer
//     4. 날짜 계산         담당자·작업 순서를 지키며 날짜를 정해요            → AiScheduler, AiDependencyRules
//     5. 흠 점검(strict)   고칠 수 없는 눈에 띄는 흠이면 다시 만들게 해요     → AiDraftReviewer
//     6. 이벤트            서버가 만들어요                                    → AiEvents
//   서버가 검증한 초안(AiDraft)
//
// 고칠 수 있는 값은 서버가 고치고, 고칠 수 없을 만큼 틀린 것만 모델에게 돌려보내요(재시도는 시간이 오래 걸려서 마지막 수단이에요).
@Component
public class AiDraftValidator {

    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context) {
        return toDraft(raw, context, true, "");
    }

    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context, boolean strict) {
        return toDraft(raw, context, strict, "");
    }

    // strict가 true면 "고칠 수는 없지만 눈에 띄는 흠"(AiDraftReviewer)도 다시 만들게 해요. 마지막 시도에서는 false로 불러서
    // 이런 흠만으로 초안을 통째로 버리지 않게 해요(미리보기에서 고칠 수 있어요). requestText는 사용자가 쓴 주제·핵심 기능 등이에요
    // (여기 적힌 기능은 "요청한 기능"으로 봐요).
    public AiDraft toDraft(AiRawDraft raw, AiDraftContext context, boolean strict, String requestText) {

        List<AiRawDraft.Sprint> rawSprints = removeForeignScript(takeSprints(raw, context.sprintCount()), strict);

        List<SprintPlan> plans = new ArrayList<>();

        for (int index = 0; index < rawSprints.size(); index++) {
            plans.add(plan(rawSprints.get(index), index, context));
        }

        // 점검은 담당자 작업 사이의 틈을 늘리기 전 날짜로 해요(늘린 기간은 여유라서 일한 양이 아니에요).
        if (strict) {
            AiDraftReviewer.review(plans.stream().map(plan -> plan.toSprint(false)).toList(), context, requestText);
        }

        return new AiDraft(plans.stream().map(plan -> plan.toSprint(true)).toList(), AiEvents.build(context));
    }

    // 날짜를 정하기 전의 스프린트예요.
    private record SprintPlan(String name, String goal, LocalDate start, LocalDate end, List<AiPlannedTask> tasks) {

        AiDraft.Sprint toSprint(boolean fillGaps) {
            return new AiDraft.Sprint(name, goal, start, end, AiScheduler.schedule(tasks, start, end, fillGaps));
        }
    }

    // ---------- 1. 개수 ----------

    // 필요한 개수만큼 앞에서 가져와요(더 많이 만들었으면 나머지는 버려요).
    private List<AiRawDraft.Sprint> takeSprints(AiRawDraft raw, int expected) {

        List<AiRawDraft.Sprint> sprints = raw == null || raw.sprints() == null ? List.of()
            : raw.sprints().stream().filter(Objects::nonNull).toList();

        if (sprints.isEmpty()) {
            throw new AiDraftException("sprints가 비어 있어요. 스프린트를 정확히 " + expected + "개 만들어 주세요.");
        }

        if (sprints.size() < expected) {
            throw new AiDraftException("스프린트가 " + sprints.size() + "개뿐이에요. 정확히 " + expected + "개를 만들어 주세요.");
        }

        return sprints.subList(0, expected);
    }

    // ---------- 2. 글 ----------

    // 한 글에서 한자·일본어가 이 비율을 넘으면 지우고 남은 글을 믿기 어려워요(다시 만들게 해요).
    private static final double MAX_FOREIGN_RATIO = 0.3;

    // 모델이 만든 글(스프린트·작업)에 섞인 한자·일본어를 지워요. 사용자가 직접 쓴 고정 일정은 보지 않아요.
    // 모델(qwen)은 다시 시켜도 같은 실수를 자주 해서, 몇 글자만 섞였으면 다시 만들지 않고 서버가 지워요.
    // strict(마지막 시도 전)일 때만, 글 대부분이 외국 글자이거나 지우면 이름·제목이 비는 경우에 다시 만들게 해요.
    private List<AiRawDraft.Sprint> removeForeignScript(List<AiRawDraft.Sprint> sprints, boolean strict) {

        List<AiRawDraft.Sprint> cleaned = new ArrayList<>();

        for (AiRawDraft.Sprint sprint : sprints) {

            List<AiRawDraft.Task> tasks = null;

            if (sprint.tasks() != null) {
                tasks = new ArrayList<>();

                for (AiRawDraft.Task task : sprint.tasks()) {
                    tasks.add(task == null ? null
                        : new AiRawDraft.Task(strip(task.title(), true, strict), strip(task.description(), false, strict),
                            task.priority(), task.assigneeUserId(), task.weekInSprint(), task.durationDays()));
                }
            }

            cleaned.add(new AiRawDraft.Sprint(strip(sprint.name(), true, strict), strip(sprint.goal(), false, strict), tasks));
        }

        return cleaned;
    }

    // required는 이름·제목처럼 비면 안 되는 글이에요.
    private String strip(String text, boolean required, boolean strict) {

        String found = AiText.findForeignScript(text);

        if (found == null) {
            return text;
        }

        String stripped = AiText.stripForeignScript(text);

        if (strict && (AiText.foreignRatio(text) > MAX_FOREIGN_RATIO || (required && stripped.isBlank()))) {
            throw new AiDraftException("한자나 일본어 글자('" + found + "')가 섞여 있어요. 모든 글을 한글로만 써 주세요.");
        }

        return stripped;
    }

    // ---------- 3·4. 스프린트 하나 ----------

    private SprintPlan plan(AiRawDraft.Sprint raw, int index, AiDraftContext context) {

        LocalDate start = context.sprintStart(index);
        LocalDate end = context.sprintEnd(index);

        List<AiPlannedTask> tasks = cleanTasks(raw, context.weeksOf(index), context);

        if (tasks.isEmpty()) {
            throw new AiDraftException((index + 1) + "번째 스프린트에 작업이 없어요. 스프린트마다 작업을 만들어 주세요.");
        }

        // 주차 순으로 놓아요(같은 주 안에서는 모델이 쓴 순서 그대로).
        tasks.sort(Comparator.comparingInt(AiPlannedTask::week));

        AiRoleAssigner.fix(tasks, context);
        AiTaskPrioritizer.apply(tasks);

        String goal = AiText.fixParticles(AiText.clean(raw.goal(), AiDraftLimits.MAX_GOAL));

        return new SprintPlan(AiText.sprintName(raw.name(), index + 1), goal.isEmpty() ? null : goal, start, end, tasks);
    }

    // 모델 작업을 정리해요. 제목이 비어 있으면 버리고, 주차·기간은 범위 안으로, 담당자는 멤버가 아니면 비워요.
    private List<AiPlannedTask> cleanTasks(AiRawDraft.Sprint raw, int weeks, AiDraftContext context) {

        List<AiPlannedTask> tasks = new ArrayList<>();

        if (raw.tasks() == null) {
            return tasks;
        }

        for (AiRawDraft.Task task : raw.tasks()) {

            if (task == null || tasks.size() >= AiDraftLimits.MAX_TASKS_PER_SPRINT) {
                continue;
            }

            String title = AiText.fixParticles(AiText.clean(task.title(), AiDraftLimits.MAX_TITLE));

            if (title.isEmpty()) {
                continue;
            }

            Long assignee = task.assigneeUserId() != null && context.memberIds().contains(task.assigneeUserId())
                ? task.assigneeUserId()
                : null;

            tasks.add(new AiPlannedTask(title, AiText.fixParticles(AiText.cleanDescription(task.description())),
                parsePriority(task.priority()), assignee, clamp(task.weekInSprint(), 1, weeks),
                clamp(task.durationDays(), 1, AiDraftLimits.MAX_TASK_DAYS)));
        }

        return tasks;
    }

    private static TaskPriority parsePriority(String value) {

        if (value == null) {
            return TaskPriority.MEDIUM;
        }

        try {
            return TaskPriority.valueOf(value.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return TaskPriority.MEDIUM;
        }
    }

    private static int clamp(Integer value, int min, int max) {
        return value == null ? min : Math.max(min, Math.min(max, value));
    }

    // ---------- 사용자가 고친 최종본 확인 ----------

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
            validateSprint(sprint, memberIds);
        }

        for (AiDraft.Event event : events) {
            if (event == null || isBlank(event.title()) || event.date() == null) {
                throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
            }
        }
    }

    private void validateSprint(AiDraft.Sprint sprint, Set<Long> memberIds) {

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

            validateSubtasks(task);
        }
    }

    // 하위 작업은 작업마다 정해진 개수 안에서, 비지 않고 길지 않은 글이어야 해요.
    private void validateSubtasks(AiDraft.Task task) {

        List<String> subtasks = task.subtasks();

        if (subtasks == null) {
            return;
        }

        if (subtasks.size() > AiDraftLimits.MAX_SUBTASKS_PER_TASK) {
            throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
        }

        for (String content : subtasks) {
            if (isBlank(content) || content.strip().length() > AiDraftLimits.MAX_SUBTASK_CONTENT) {
                throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
            }
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
