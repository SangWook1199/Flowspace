package com.flowspace.service.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
import com.flowspace.dto.ai.AiDraftLimits;

// 초안의 이벤트(일정)를 만들어요. 이벤트는 모델이 아니라 서버가 만들어요(모델은 없는 일정을 지어내기 때문이에요).
// 사용자가 정한 고정 일정을 먼저 넣고, 스프린트마다 마지막 평일에 "스프린트 N 리뷰"를 더해요(같은 제목·날짜는 한 번만).
final class AiEvents {

    private AiEvents() {
    }

    static List<AiDraft.Event> build(AiDraftContext context) {

        Map<String, AiDraft.Event> unique = new LinkedHashMap<>();

        for (AiDraftContext.FixedEvent fixed : context.fixedEvents()) {

            if (unique.size() >= AiDraftLimits.MAX_EVENTS) {
                break;
            }

            if (fixed == null || fixed.date() == null || fixed.date().isBefore(context.startDate())
                || fixed.date().isAfter(context.endDate())) {
                continue;
            }

            add(unique, AiText.clean(fixed.title(), AiDraftLimits.MAX_TITLE), fixed.date());
        }

        for (int index = 0; index < context.sprintCount() && unique.size() < AiDraftLimits.MAX_EVENTS; index++) {

            LocalDate date = AiWorkdays.onOrBefore(context.sprintEnd(index));

            if (date.isBefore(context.sprintStart(index))) {
                date = context.sprintStart(index);
            }

            add(unique, "스프린트 " + (index + 1) + " 리뷰", date);
        }

        List<AiDraft.Event> events = new ArrayList<>(unique.values());
        events.sort(Comparator.comparing(AiDraft.Event::date).thenComparing(AiDraft.Event::title));

        return events;
    }

    private static void add(Map<String, AiDraft.Event> unique, String title, LocalDate date) {

        if (!title.isEmpty()) {
            unique.putIfAbsent(title + "|" + date, new AiDraft.Event(title, date));
        }
    }
}
