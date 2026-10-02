import { useMemo } from "react";

import { toDateKey, diffDays } from "../../utils/date";
import { swatchStyle, tintStyle } from "../../utils/color";
import { isEventOnDate, sortEventsByStart } from "../../utils/calendarRange";

const STATUS_COLOR = {
  GRAY: "#64748B",
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  WHITE: "#FFFFFF",
};

const EVENT_COLOR = {
  BLUE: "#3B82F6",
  PURPLE: "#8B5CF6",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  GRAY: "#64748B",
  WHITE: "#FFFFFF",
};

const ROW_HEIGHT = 22;

export default function CalendarGrid({
  currentMonth,
  tasks,
  events,
  selectedDate,
  onSelectDate,
  onMonthChange,
}) {
  const weeks = useMemo(() => createCalendar(currentMonth), [currentMonth]);

  // 주마다 막대 배치를 다시 계산하는 건 비용이 있어서, 달/작업이 바뀔 때만 계산해요.
  const layouts = useMemo(
    () => weeks.map((week) => createWeekLayout(tasks || [], week)),
    [weeks, tasks],
  );

  // 같은 날 안에서 일정이 시간 순으로 보이게 한 번만 정렬해둬요.
  const sortedEvents = useMemo(() => sortEventsByStart(events), [events]);

  return (
    <section className="calendarGrid">
      <div className="weekHeader">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => {
        const layout = layouts[weekIndex];

        return (
          <div className="calendarWeek" key={week[0].full}>
            {week.map((date, dayIndex) => {
              // end_datetime이 ""(빈 문자열)인 일정도 하루짜리로 보려고 공용 규칙(isEventOnDate)을 써요.
              const dayEvents = sortedEvents.filter((event) =>
                isEventOnDate(event, date.full),
              );

              const visibleEvents = dayEvents.slice(0, 2);
              const hiddenEvents = dayEvents.slice(2);

              const spacer = layout.offsets[dayIndex];
              const hasMoreTask = layout.more[dayIndex] > 0;

              const selectDate = () => {
                if (!date.isCurrentMonth) {
                  onMonthChange(new Date(date.year, date.month, 1));
                }
                onSelectDate(date.full);
              };

              return (
                <div
                  key={date.full}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedDate === date.full}
                  aria-label={`${date.month + 1}월 ${date.day}일, 작업 ${
                    layout.total[dayIndex]
                  }개, 일정 ${dayEvents.length}개`}
                  className={`calendarCell ${
                    selectedDate === date.full ? "selected" : ""
                  } ${!date.isCurrentMonth ? "otherMonth" : ""}`}
                  onClick={selectDate}
                  onKeyDown={(e) => {
                    // 안쪽 요소(툴팁 등)에서 올라온 키 입력은 무시하고, 칸 자체에 포커스가 있을 때만 선택해요.
                    if (e.target !== e.currentTarget) return;

                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectDate();
                    }
                  }}
                >
                  <span
                    className={`dayNumber ${!date.isCurrentMonth ? "dim" : ""}`}
                  >
                    {date.day}
                  </span>

                  <div
                    className="taskSpacer"
                    style={{ height: `${spacer}px` }}
                  />

                  {hasMoreTask && (
                    <div className="taskMoreWrap">
                      <span
                        className="taskMore"
                        role="note"
                        aria-label={`작업 ${layout.more[dayIndex]}개 더보기: ${layout.hidden[dayIndex]
                          .map((task) => task.title)
                          .join(", ")}`}
                      >
                        +{layout.more[dayIndex]} 더보기
                      </span>

                      <div className="taskTooltip">
                        {layout.hidden[dayIndex].map((task) => (
                          <div key={task.id} className="tooltipTask">
                            <span
                              className="tooltipDot"
                              style={swatchStyle(STATUS_COLOR[task.status?.color])}
                            />
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {spacer > 0 && dayEvents.length > 0 && (
                    <div className="cellDivider" />
                  )}

                  <div className="cellEventArea">
                    {visibleEvents.map((event) => (
                      <div
                        key={event.event_id}
                        className="eventBar"
                        style={tintStyle(EVENT_COLOR[event.color])}
                      >
                        {event.title}
                      </div>
                    ))}

                    {hiddenEvents.length > 0 && (
                      <div className="eventMoreWrap">
                        <span
                          className="eventMoreText"
                          role="note"
                          aria-label={`일정 ${hiddenEvents.length}개 더보기: ${hiddenEvents
                            .map((event) => event.title)
                            .join(", ")}`}
                        >
                          +{hiddenEvents.length} 더보기
                        </span>

                        <div className="eventTooltip">
                          {hiddenEvents.map((event) => (
                            <div key={event.event_id} className="tooltipEvent">
                              <span
                                className="tooltipDot"
                                style={swatchStyle(EVENT_COLOR[event.color])}
                              />
                              {event.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="taskLayer">
              {layout.bars.map((bar) => (
                <div
                  key={bar.key}
                  className="taskBar"
                  style={{
                    left: `calc(${(bar.start / 7) * 100}% + 4px)`,
                    width: `calc(${((bar.end - bar.start + 1) / 7) * 100}% - 8px)`,
                    top: `${bar.row * ROW_HEIGHT}px`, // + 10 제거
                    ...swatchStyle(STATUS_COLOR[bar.color]),
                  }}
                >
                  {bar.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ================= Week Layout ================= */

function createWeekLayout(tasks, week) {
  const bars = [];
  const hidden = Array.from({ length: 7 }, () => []);
  const more = Array(7).fill(0);
  const total = Array(7).fill(0);

  const occupied = [];

  const weekStartKey = week[0].full;

  // 이 주에 걸치는 작업만 칸 위치(0~6)로 바꿔요. 날짜가 잘못됐거나 종료가 시작보다 앞선 작업은
  // 막대를 그리면 음수 너비가 되어 레이아웃이 깨지므로 건너뛰어요.
  const placed = [];

  tasks.forEach((task) => {
    const startOffset = diffDays(weekStartKey, task.start);
    const endOffset = diffDays(weekStartKey, task.end);

    if (startOffset === null || endOffset === null || endOffset < startOffset) {
      return;
    }

    if (endOffset < 0 || startOffset > 6) return;

    placed.push({
      task,
      startIndex: Math.max(0, startOffset),
      endIndex: Math.min(6, endOffset),
      length: endOffset - startOffset,
    });
  });

  // 시작이 빠른 순 → 같으면 오래 걸리는(긴) 작업 먼저 배치해요. 짧은 작업이 먼저 윗줄을 차지하면
  // 긴 막대가 아랫줄로 밀려서 "+N 더보기"로 숨는 일이 생겨서, 긴 막대가 0번 줄을 가져가게 해요.
  placed.sort(
    (a, b) =>
      a.startIndex - b.startIndex ||
      b.length - a.length ||
      String(a.task.start).localeCompare(String(b.task.start)) ||
      Number(a.task.id) - Number(b.task.id),
  );

  placed.forEach(({ task, startIndex, endIndex }) => {
    let row = 0;

    while (true) {
      if (!occupied[row]) occupied[row] = [];

      const overlap = occupied[row].some(
        (r) => !(endIndex < r.start || startIndex > r.end),
      );

      if (!overlap) break;

      row++;
    }

    occupied[row].push({
      start: startIndex,
      end: endIndex,
    });

    for (let i = startIndex; i <= endIndex; i++) total[i]++;

    if (row < 2) {
      bars.push({
        key: `${task.id}-${weekStartKey}`,
        id: task.id,
        title: task.title,
        color: task.status?.color,
        start: startIndex,
        end: endIndex,
        row,
      });
    } else {
      for (let i = startIndex; i <= endIndex; i++) {
        more[i]++;
        hidden[i].push(task);
      }
    }
  });

  const offsets = Array(7).fill(0);

  for (let day = 0; day < 7; day++) {
    const dayBars = bars.filter((bar) => day >= bar.start && day <= bar.end);

    const maxRow = dayBars.reduce((max, bar) => Math.max(max, bar.row), -1);

    offsets[day] = (maxRow + 1) * ROW_HEIGHT;
  }

  return {
    bars,
    hidden,
    more,
    total,
    offsets,
  };
}

/* ================= Calendar ================= */

function createCalendar(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);

  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks = [];

  for (let w = 0; w < 6; w++) {
    const week = [];

    for (let d = 0; d < 7; d++) {
      const current = new Date(start);
      current.setDate(start.getDate() + w * 7 + d);

      week.push({
        day: current.getDate(),
        full: toDateKey(current),
        isCurrentMonth: current.getMonth() === month.getMonth(),
        month: current.getMonth(),
        year: current.getFullYear(),
      });
    }

    weeks.push(week);
  }

  return weeks;
}
