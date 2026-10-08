import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { buildMonthWeeks } from "../../utils/calendarMonth";
import { calendarColor } from "../../utils/calendarColors";
import { isEventOnDate } from "../../utils/calendarRange";
import { getSprintPhase } from "../../utils/sprintRange";
import { groupSprintsByStatus } from "../../utils/calendarSprint";
import { isLightHex } from "../../utils/color";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const VIEW_OPTIONS = [
  { key: "tasks", label: "작업" },
  { key: "events", label: "일정" },
  { key: "done", label: "완료된 작업" },
  { key: "long", label: "긴 작업 (7일 초과)" },
];

// 스프린트 오른쪽에 보여줄 한 단어예요. 진행 중인 스프린트만 기간 진행률(또는 기간 지남/시작 전)을 보여주고,
// 계획됨/완료됨은 그룹 제목이 이미 말해주니 비워둬요.
const phaseLabel = (sprint, today) => {
  if (sprint.status !== "ACTIVE") return "";

  const info = getSprintPhase(sprint, today);
  if (info.phase === "during") return `${info.timeProgress}%`;
  if (info.phase === "before") return "시작 전";
  if (info.phase === "after") return "기간 지남";
  return "";
};

// 왼쪽 레일: 일정 추가, 미니 달력, 스프린트 선택, 표시 토글.
export default function CalendarRail({
  currentMonth,
  selectedDate,
  today,
  events,
  sprint,
  sprintList,
  onSprintChange,
  view,
  onToggleView,
  hiddenLongCount,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onAddEvent,
}) {
  const days = useMemo(() => buildMonthWeeks(currentMonth).flat(), [currentMonth]);
  const rangeStart = sprint?.startDate ?? "";
  const rangeEnd = sprint?.endDate ?? "";
  const groups = useMemo(() => groupSprintsByStatus(sprintList), [sprintList]);

  // 완료됨 그룹은 길어지기 쉬워서 접어둬요(지금 보는 스프린트가 거기 있으면 펼쳐요).
  const [completedOpen, setCompletedOpen] = useState(false);

  return (
    <aside className="calendarRail" aria-label="캘린더 설정">
      <h1>캘린더</h1>

      <button type="button" className="railAddBtn" onClick={onAddEvent}>
        <Plus size={15} /> 일정 추가
      </button>

      {/* 미니 달력: 스프린트 기간은 보라 띠, 일정이 있는 날은 점으로 보여요. */}
      <section className="miniMonth" aria-label="미니 달력">
        <header>
          <b>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </b>
          <span>
            <button type="button" aria-label="이전 달" onClick={onPrevMonth}>
              <ChevronLeft size={15} />
            </button>
            <button type="button" aria-label="다음 달" onClick={onNextMonth}>
              <ChevronRight size={15} />
            </button>
          </span>
        </header>

        <div className="miniGrid">
          {WEEKDAYS.map((day) => (
            <span key={day} className="miniWeekday">
              {day}
            </span>
          ))}

          {days.map((date, index) => {
            const inRange = rangeStart && date.full >= rangeStart && date.full <= rangeEnd;
            const dow = index % 7;
            const hasEvent = events.some((event) => isEventOnDate(event, date.full));

            const classes = [
              "miniDay",
              !date.isCurrentMonth && "dim",
              inRange && "inRange",
              inRange && (date.full === rangeStart || dow === 0) && "rangeStart",
              inRange && (date.full === rangeEnd || dow === 6) && "rangeEnd",
              date.full === today && "today",
              date.full === selectedDate && "selected",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                type="button"
                key={date.full}
                className={classes}
                aria-label={`${date.month + 1}월 ${date.day}일${hasEvent ? ", 일정 있음" : ""}`}
                aria-pressed={date.full === selectedDate}
                onClick={() => onSelectDate(date)}
              >
                <b>{date.day}</b>
                {hasEvent && <i />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="railSection">
        <h6>스프린트</h6>

        <div className="railSprintList" role="radiogroup" aria-label="스프린트 선택">
          {groups.length === 0 && <p className="railEmpty">아직 스프린트가 없어요.</p>}
          {groups.map((group) => {
            const collapsible = group.key === "COMPLETED";
            const holdsSelected = group.items.some((item) => item.id === sprint?.id);
            const open = !collapsible || completedOpen || holdsSelected;

            return (
              <div className="railSprintGroup" key={group.key}>
                {collapsible ? (
                  <button
                    type="button"
                    className="railSprintGroupHead toggle"
                    aria-expanded={open}
                    disabled={holdsSelected}
                    onClick={() => setCompletedOpen((prev) => !prev)}
                  >
                    <i style={{ background: group.color }} />
                    <span>{group.label}</span>
                    <b>{group.items.length}</b>
                    <ChevronDown size={13} className={open ? "open" : ""} />
                  </button>
                ) : (
                  <div className="railSprintGroupHead">
                    <i style={{ background: group.color }} />
                    <span>{group.label}</span>
                    <b>{group.items.length}</b>
                  </div>
                )}

                {open &&
                  group.items.map((item) => {
                    const active = item.id === sprint?.id;
                    const color = calendarColor(item.color);
                    // 흰색 스프린트는 테두리가 안 보여서 진한 색으로 그려요.
                    const ring = isLightHex(color) ? "#111827" : color;

                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        key={item.id}
                        className={`railSprint${active ? " active" : ""}${group.key === "COMPLETED" ? " completed" : ""}`}
                        onClick={() => onSprintChange(item.id)}
                      >
                        <span
                          className="railSprintCheck"
                          style={{ background: active ? color : "transparent", boxShadow: `inset 0 0 0 1.5px ${ring}` }}
                        >
                          {active && <Check size={10} strokeWidth={4} color={isLightHex(color) ? "#111827" : "#fff"} />}
                        </span>

                        <span className="railSprintName">
                          {item.name}
                          <small>
                            {item.startDate?.slice(5).replace("-", "/")} ~ {item.endDate?.slice(5).replace("-", "/")}
                          </small>
                        </span>

                        <em>{phaseLabel(item, today)}</em>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="railSection">
        <h6>표시</h6>

        {VIEW_OPTIONS.map(({ key, label }) => (
          <div className="railToggle" key={key}>
            <span id={`calView-${key}`}>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={view[key]}
              aria-labelledby={`calView-${key}`}
              className={`switchBtn${view[key] ? " on" : ""}`}
              onClick={() => onToggleView(key)}
            />
          </div>
        ))}

        {!view.long && hiddenLongCount > 0 && (
          <p className="railHint">
            기간이 긴 작업 <b>{hiddenLongCount}개</b>가 숨겨져 있어요.{" "}
            <button type="button" onClick={() => onToggleView("long")}>
              모두 보기
            </button>
          </p>
        )}
      </section>
    </aside>
  );
}
