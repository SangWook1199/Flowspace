import { useMemo } from "react";

const STATUS_COLOR = {
  GRAY: "#64748B",
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
};

const EVENT_COLOR = {
  BLUE: "#3B82F6",
  PURPLE: "#8B5CF6",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  GRAY: "#64748B",
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

  return (
    <section className="calendarGrid">
      <div className="weekHeader">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => {
        const layout = createWeekLayout(tasks, week);

        return (
          <div className="calendarWeek" key={weekIndex}>
            {week.map((date, dayIndex) => {
              const dayEvents = events.filter((event) => {
                const start = event.start_datetime.slice(0, 10);
                const end = (event.end_datetime ?? event.start_datetime).slice(
                  0,
                  10,
                );

                return date.full >= start && date.full <= end;
              });

              const visibleEvents = dayEvents.slice(0, 2);
              const hiddenEvents = dayEvents.slice(2);

              const spacer = layout.offsets[dayIndex];
              const hasMoreTask = layout.more[dayIndex] > 0;

              return (
                <div
                  key={date.full}
                  className={`calendarCell ${
                    selectedDate === date.full ? "selected" : ""
                  } ${!date.isCurrentMonth ? "otherMonth" : ""}`}
                  onClick={() => {
                    if (!date.isCurrentMonth) {
                      onMonthChange(new Date(date.year, date.month, 1));
                    }
                    onSelectDate(date.full);
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
                      <span className="taskMore">
                        +{layout.more[dayIndex]} 더보기
                      </span>

                      <div className="taskTooltip">
                        {layout.hidden[dayIndex].map((task) => (
                          <div key={task.id} className="tooltipTask">
                            <span
                              className="tooltipDot"
                              style={{
                                background: STATUS_COLOR[task.status.color],
                              }}
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
                        style={{
                          background: `${EVENT_COLOR[event.color]}22`,
                          color: EVENT_COLOR[event.color],
                        }}
                      >
                        {event.title}
                      </div>
                    ))}

                    {hiddenEvents.length > 0 && (
                      <div className="eventMoreWrap">
                        <span className="eventMoreText">
                          +{hiddenEvents.length} 더보기
                        </span>

                        <div className="eventTooltip">
                          {hiddenEvents.map((event) => (
                            <div key={event.event_id} className="tooltipEvent">
                              <span
                                className="tooltipDot"
                                style={{
                                  background: EVENT_COLOR[event.color],
                                }}
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
                    background: STATUS_COLOR[bar.color],
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

  const occupied = [];

  const weekStart = parseDate(week[0].full);
  const weekEnd = parseDate(week[6].full);

  tasks.forEach((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);

    if (end < weekStart || start > weekEnd) return;

    const startIndex = start < weekStart ? 0 : diffDays(weekStart, start);
    const endIndex = end > weekEnd ? 6 : diffDays(weekStart, end);

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

    if (row < 2) {
      bars.push({
        key: `${task.id}-${week[0].full}`,
        id: task.id,
        title: task.title,
        color: task.status.color,
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
        full: formatDate(current),
        isCurrentMonth: current.getMonth() === month.getMonth(),
        month: current.getMonth(),
        year: current.getFullYear(),
      });
    }

    weeks.push(week);
  }

  return weeks;
}

/* ================= Util ================= */

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}
