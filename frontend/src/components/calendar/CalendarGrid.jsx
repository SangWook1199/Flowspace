import { useMemo } from "react";

import { diffDays } from "../../utils/date";
import { buildMonthWeeks } from "../../utils/calendarMonth";
import { calendarColor } from "../../utils/calendarColors";
import { LIGHT_OUTLINE, isLightHex, swatchStyle, tintStyle } from "../../utils/color";
import { getEventDayRange, isEventOnDate, sortEventsByStart } from "../../utils/calendarRange";
import { compareDayTasks } from "../../utils/calendarTaskOrder";
import StatusIcon from "./StatusIcon";

// 한 칸은 항상 같은 높이예요: 날짜 줄 아래에 "줄" SLOT_COUNT개만 있고, 작업 막대와 일정이 이 줄을 나눠 써요.
// 작업/일정이 늘어도 칸이 커지지 않고 "+N" 으로 접혀요(작업 막대는 최대 MAX_TASK_ROWS줄).
// 며칠에 걸친 일정은 작업처럼 이어진 막대로, 하루짜리 일정은 칸 안의 알약으로 그려요.
const SLOT_COUNT = 6;
const MAX_TASK_ROWS = 3;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 달력 칸 격자예요. today("YYYY-MM-DD")는 오늘 표시에 써요(선택한 날짜와 따로 보여요).
export default function CalendarGrid({
  currentMonth,
  tasks,
  events,
  selectedDate,
  today = "",
  onSelectDate,
  onMonthChange,
  onOpenEvent,
}) {
  const weeks = useMemo(() => buildMonthWeeks(currentMonth), [currentMonth]);

  // 같은 날 안에서 일정이 시간 순으로 보이게 한 번만 정렬해둬요.
  const sortedEvents = useMemo(() => sortEventsByStart(events), [events]);

  // 주마다 막대 배치를 다시 계산하는 건 비용이 있어서, 달/작업/일정이 바뀔 때만 계산해요.
  const layouts = useMemo(
    () => weeks.map((week) => createWeekLayout(tasks || [], sortedEvents, week)),
    [weeks, tasks, sortedEvents],
  );

  const selectDate = (date) => {
    if (!date.isCurrentMonth) onMonthChange(new Date(date.year, date.month, 1));
    onSelectDate(date.full);
  };

  // 작업 막대를 눌러도 그 아래 날짜 칸을 누른 것처럼 동작해요(막대 위의 가로 위치로 어느 날인지 계산해요).
  const selectByPosition = (week) => (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const column = Math.min(6, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 7)));
    selectDate(week[column]);
  };

  return (
    <section className="calendarGrid" aria-label="월간 달력">
      <div className="weekHeader">
        {WEEKDAYS.map((day, index) => (
          <div key={day} className={index === 0 ? "sun" : index === 6 ? "sat" : ""}>
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => {
        const layout = layouts[weekIndex];

        return (
          <div className="calendarWeek" key={week[0].full}>
            <div className="weekCells">
              {week.map((date, dayIndex) => {
                // end_datetime이 ""(빈 문자열)인 일정도 하루짜리로 보려고 공용 규칙(isEventOnDate)을 써요.
                const dayEvents = sortedEvents.filter((event) => isEventOnDate(event, date.full));

                const hiddenTasks = layout.hidden[dayIndex];

                const dow = dayIndex === 0 ? " sun" : dayIndex === 6 ? " sat" : "";

                return (
                  <div
                    key={date.full}
                    role="button"
                    tabIndex={0}
                    data-date={date.full}
                    aria-pressed={selectedDate === date.full}
                    aria-label={`${date.month + 1}월 ${date.day}일, 작업 ${layout.total[dayIndex]}개, 일정 ${dayEvents.length}개`}
                    className={`calendarCell${dayIndex === 0 || dayIndex === 6 ? " weekend" : ""}${
                      selectedDate === date.full ? " selected" : ""
                    }`}
                    onClick={() => selectDate(date)}
                    onKeyDown={(e) => {
                      // 안쪽 요소에서 올라온 키 입력은 무시하고, 칸 자체에 포커스가 있을 때만 선택해요.
                      if (e.target !== e.currentTarget) return;

                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectDate(date);
                      }
                    }}
                  >
                    <div className="dayRow">
                      <span
                        className={`dayNumber${date.isCurrentMonth ? "" : " dim"}${dow}${today === date.full ? " isToday" : ""}`}
                      >
                        {date.day}
                      </span>

                      {/* 막대에 못 담은 작업 수. 같은 작업이 며칠 이어지면 구간의 첫 칸에만 보여줘요. */}
                      {hiddenTasks.length > 0 && layout.moreAnchor[dayIndex] && (
                        <span
                          className="taskMore"
                          title={`작업 ${hiddenTasks.length}개 더: ${hiddenTasks.map((task) => task.title).join(", ")}`}
                        >
                          +{hiddenTasks.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="taskLayer" onClick={selectByPosition(week)}>
              {layout.bars.map((bar) => {
                // 작업 막대는 상태 색으로 칠해요(연한 배경 + 왼쪽 색 띠 + 아이콘). 흰색 상태는 회색 띠로 보여줘요.
                const hex = calendarColor(bar.color);
                const light = isLightHex(hex);

                return (
                  <div
                    key={bar.key}
                    className={`taskChip${bar.done ? " done" : ""}${bar.fromPrev ? " fromPrev" : ""}${bar.toNext ? " toNext" : ""}`}
                    title={bar.title}
                    style={{
                      gridColumn: `${bar.start + 1} / ${bar.end + 2}`,
                      gridRow: bar.row + 1,
                      "--chip-color": light ? LIGHT_OUTLINE : hex,
                      background: light ? "#F8FAFC" : `${hex}26`,
                    }}
                  >
                    <StatusIcon category={bar.category} color={hex} />
                    <span>{bar.title}</span>
                  </div>
                );
              })}
            </div>

            <div className={`eventLayer${layout.hasTasks ? " withTasks" : ""}`}>
              {layout.eventItems.map((item) =>
                item.kind === "more" ? (
                  <div
                    key={item.key}
                    className="eventMore"
                    style={{ gridColumn: item.col + 1, gridRow: item.row + 1 }}
                    title={item.names}
                  >
                    +{item.count}개 더보기
                  </div>
                ) : (
                  <div
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    className={`eventPill${item.span > 1 || item.fromPrev || item.toNext ? " bar" : ""}${
                      item.fromPrev ? " fromPrev" : ""
                    }${item.toNext ? " toNext" : ""}`}
                    style={{
                      gridColumn: `${item.col + 1} / span ${item.span}`,
                      gridRow: item.row + 1,
                      ...tintStyle(calendarColor(item.event.color), "22"),
                      color: "#1f2328",
                    }}
                    title={item.event.title}
                    onClick={() => onOpenEvent?.(item.event)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenEvent?.(item.event);
                      }
                    }}
                  >
                    <i style={swatchStyle(calendarColor(item.event.color))} />
                    {item.showTime && <time>{formatTime(item.event.start_datetime)}</time>}
                    <span>{item.event.title}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// "2026-10-06T09:00" → "09:00" (시간이 없으면 빈 문자열)
function formatTime(value) {
  const match = /T(\d{2}:\d{2})/.exec(String(value ?? ""));
  return match ? match[1] : "";
}

/* ================= Week Layout ================= */

function createWeekLayout(tasks, events, week) {
  const bars = [];
  const hidden = Array.from({ length: 7 }, () => []);
  const total = Array(7).fill(0);
  const used = Array(7).fill(0);

  const occupied = [];
  const weekStartKey = week[0].full;

  // 이 주에 걸치는 작업만 칸 위치(0~6)로 바꿔요. 날짜가 잘못됐거나 종료가 시작보다 앞선 작업은
  // 막대를 그리면 음수 너비가 되어 레이아웃이 깨지므로 건너뛰어요.
  const placed = [];

  tasks.forEach((task) => {
    const startOffset = diffDays(weekStartKey, task.start);
    const endOffset = diffDays(weekStartKey, task.end);

    if (startOffset === null || endOffset === null || endOffset < startOffset) return;
    if (endOffset < 0 || startOffset > 6) return;

    placed.push({
      task,
      startIndex: Math.max(0, startOffset),
      endIndex: Math.min(6, endOffset),
      length: endOffset - startOffset,
      fromPrev: startOffset < 0,
      toNext: endOffset > 6,
    });
  });

  // 날짜 상세 패널과 같은 순서(우선순위 높은 작업이 위쪽 줄)로 줄을 배치해요. 같은 순위면 시작이 빠른 것,
  // 오래 걸리는(긴) 것 먼저예요. 막대는 한 번 정한 줄을 며칠 동안 그대로 쓰기 때문에, 순서가 곧 줄 순서가 돼요.
  placed.sort(
    (a, b) =>
      compareDayTasks(a.task, b.task) ||
      a.startIndex - b.startIndex ||
      b.length - a.length ||
      String(a.task.start).localeCompare(String(b.task.start)),
  );

  placed.forEach(({ task, startIndex, endIndex, fromPrev, toNext }) => {
    let row = 0;

    while (true) {
      if (!occupied[row]) occupied[row] = [];

      const overlap = occupied[row].some((r) => !(endIndex < r.start || startIndex > r.end));

      if (!overlap) break;

      row++;
    }

    occupied[row].push({ start: startIndex, end: endIndex });

    for (let i = startIndex; i <= endIndex; i++) total[i]++;

    if (row < MAX_TASK_ROWS) {
      bars.push({
        key: `${task.id}-${weekStartKey}`,
        id: task.id,
        title: task.title,
        color: task.status?.color,
        category: task.status?.category,
        done: task.status?.category === "DONE",
        start: startIndex,
        end: endIndex,
        row,
        fromPrev,
        toNext,
      });

      for (let i = startIndex; i <= endIndex; i++) used[i] = Math.max(used[i], row + 1);
    } else {
      for (let i = startIndex; i <= endIndex; i++) hidden[i].push(task);
    }
  });

  // 숨은 작업 목록이 앞날과 똑같으면 "+N"을 또 보여주지 않아요(구간의 첫 칸에만 보여줘요).
  const signature = (day) => hidden[day].map((task) => task.id).join(",");
  const moreAnchor = Array.from(
    { length: 7 },
    (_, day) => hidden[day].length > 0 && (day === 0 || signature(day) !== signature(day - 1)),
  );

  const eventItems = layoutEvents(events, week, weekStartKey, used);

  return { bars, hidden, moreAnchor, total, used, hasTasks: bars.length > 0, eventItems };
}

// 일정 배치: 며칠에 걸친 일정(막대)을 먼저 작업 막대 아래 줄에 놓고, 하루짜리 일정은 남은 줄에 시간 순으로 채워요.
// 막대는 맨 아래 줄을 쓰지 않아요(그 줄은 칸마다 "+N개 더보기"를 놓을 자리로 남겨둬요).
function layoutEvents(events, week, weekStartKey, used) {
  const items = [];
  const occupied = Array.from({ length: SLOT_COUNT }, () => Array(7).fill(false));
  const hiddenCount = Array(7).fill(0);
  const hiddenNames = Array.from({ length: 7 }, () => []);

  // 이 주에 걸치는 일정만 칸 위치(0~6)로 바꿔요.
  const placed = [];

  events.forEach((event) => {
    const range = getEventDayRange(event);
    const startOffset = diffDays(weekStartKey, range.start);
    const endOffset = diffDays(weekStartKey, range.end);

    if (startOffset === null || endOffset === null) return;
    if (endOffset < 0 || startOffset > 6) return;

    placed.push({
      event,
      startIndex: Math.max(0, startOffset),
      endIndex: Math.min(6, endOffset),
      multi: range.end > range.start,
      fromPrev: startOffset < 0,
      toNext: endOffset > 6,
      length: endOffset - startOffset,
    });
  });

  const firstFreeRow = (from, to, maxRow, floor) => {
    for (let row = floor; row <= maxRow; row++) {
      let free = true;
      for (let col = from; col <= to; col++) if (occupied[row][col]) free = false;
      if (free) return row;
    }
    return -1;
  };

  const take = (row, from, to) => {
    for (let col = from; col <= to; col++) occupied[row][col] = true;
  };

  // 1) 며칠에 걸친 일정: 시작이 빠른 순 → 긴 것 먼저 (작업 막대가 쓴 줄 아래부터)
  placed
    .filter((p) => p.multi)
    .sort((a, b) => a.startIndex - b.startIndex || b.length - a.length || Number(a.event.event_id) - Number(b.event.event_id))
    .forEach((p) => {
      let floor = 0;
      for (let col = p.startIndex; col <= p.endIndex; col++) floor = Math.max(floor, used[col]);

      const row = firstFreeRow(p.startIndex, p.endIndex, SLOT_COUNT - 2, floor);

      if (row < 0) {
        for (let col = p.startIndex; col <= p.endIndex; col++) {
          hiddenCount[col]++;
          hiddenNames[col].push(p.event.title);
        }
        return;
      }

      take(row, p.startIndex, p.endIndex);
      items.push({
        key: `${p.event.event_id}-${weekStartKey}`,
        kind: "bar",
        event: p.event,
        col: p.startIndex,
        span: p.endIndex - p.startIndex + 1,
        row,
        fromPrev: p.fromPrev,
        toNext: p.toNext,
        // 시간은 일정이 시작하는 막대에만 보여줘요.
        showTime: !p.fromPrev,
      });
    });

  // 2) 하루짜리 일정: 칸마다 남은 줄에 시간 순으로 채워요. 넘치면 마지막 줄을 "+N개 더보기"로 바꿔요.
  for (let col = 0; col < 7; col++) {
    const pills = placed.filter((p) => !p.multi && p.startIndex === col);
    const freeRows = [];
    for (let row = used[col]; row < SLOT_COUNT; row++) if (!occupied[row][col]) freeRows.push(row);

    const overflow = pills.length > freeRows.length || hiddenCount[col] > 0;
    const shown = overflow ? Math.max(freeRows.length - 1, 0) : pills.length;

    pills.slice(0, shown).forEach((p, index) => {
      items.push({
        key: `${p.event.event_id}-${weekStartKey}`,
        kind: "pill",
        event: p.event,
        col,
        span: 1,
        row: freeRows[index],
        fromPrev: false,
        toNext: false,
        showTime: true,
      });
    });

    if (overflow && freeRows.length > 0) {
      const rest = pills.slice(shown);
      items.push({
        key: `more-${col}-${weekStartKey}`,
        kind: "more",
        col,
        row: freeRows[shown],
        count: rest.length + hiddenCount[col],
        names: [...rest.map((p) => p.event.title), ...hiddenNames[col]].join(", "),
      });
    }
  }

  return items;
}
