import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import UserAvatar, { UnassignedAvatar } from "../sprint/UserAvatar";
import useDismiss from "../sprint/useDismiss";
import { parseDateKey } from "../../utils/date";
import { calendarColor } from "../../utils/calendarColors";
import { swatchStyle, tintStyle } from "../../utils/color";
import StatusIcon from "./StatusIcon";

const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const GAP = 8;

// "2026-10-07" → "10월 7일", "수요일"
const formatTitle = (dateKey) => {
  const date = parseDateKey(dateKey);
  return date ? { title: `${date.getMonth() + 1}월 ${date.getDate()}일`, weekday: `${WEEKDAYS[date.getDay()]}요일` } : { title: "", weekday: "" };
};

const formatTime = (date) => date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
const formatShortDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

// 선택한 날짜 칸 옆에 뜨는 상세 패널이에요. 그 날의 작업과 일정을 전부 보여줘요(달력 칸에서 숨겨진 작업도 포함).
// containerRef는 패널을 기준 위치(relative)로 그릴 부모예요. 바깥을 누르거나 Esc를 누르면 닫혀요.
export default function DayPopover({ date, today, tasks = [], events = [], containerRef, onClose, onAddEvent, onOpenTask, onOpenEvent }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const { title, weekday } = formatTitle(date);

  const place = useCallback(() => {
    const container = containerRef.current;
    const panel = panelRef.current;
    const cell = container?.querySelector(`[data-date="${date}"]`);
    if (!container || !panel || !cell) return;

    const box = container.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;

    // 칸의 오른쪽에 붙이고, 공간이 모자라면 왼쪽에 붙여요. 세로는 칸 위쪽에 맞추되 컨테이너 안에 들어오게 해요.
    let left = rect.right - box.left + GAP;
    if (left + width > box.width - GAP) left = rect.left - box.left - width - GAP;
    left = Math.max(GAP, left);

    let top = rect.top - box.top - GAP;
    top = Math.max(GAP, Math.min(top, box.height - height - GAP));

    setPos({ left, top });
  }, [containerRef, date]);

  useLayoutEffect(() => {
    place();
  }, [place, tasks.length, events.length]);

  useLayoutEffect(() => {
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  useDismiss(true, panelRef, onClose);

  return (
    <div ref={panelRef} className="dayPopover" role="dialog" aria-label={`${title} 상세`} style={pos}>
      <header>
        <h3>
          {title}
          <small>
            {weekday}
            {date === today ? " · 오늘" : ""}
          </small>
        </h3>

        <button type="button" className="iconBtn" aria-label="닫기" onClick={onClose}>
          <X size={14} />
        </button>
      </header>

      <div className="popSection">
        <h4>
          <span>작업</span>
          <span>{tasks.length}</span>
        </h4>

        {tasks.length === 0 ? (
          <p className="popEmpty">이 날 진행하는 작업이 없어요.</p>
        ) : (
          tasks.map((task) => {
            const assignees = task.assignees ?? [];

            return (
              <div
                role="button"
                tabIndex={0}
                className="popTask"
                key={task.id}
                title="작업 페이지에서 열기"
                onClick={() => onOpenTask?.(task)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenTask?.(task);
                  }
                }}
              >
                <i className="popTaskBar" style={swatchStyle(calendarColor(task.status?.color))} />
                <StatusIcon category={task.status?.category} color={calendarColor(task.status?.color)} />

                <div className="popTaskBody">
                  <b title={task.title}>{task.title}</b>
                  <div className="popTaskMeta">
                    {task.status?.name && (
                      <em className="popStatus" style={tintStyle(calendarColor(task.status?.color), "26")}>
                        {task.status.name}
                      </em>
                    )}
                    <small>
                      {task.code}
                      {task.total > 0 ? ` · 하위 ${task.complete}/${task.total}` : ""}
                      {` · ${task.start.slice(5).replace("-", "/")} ~ ${task.end.slice(5).replace("-", "/")}`}
                    </small>
                  </div>
                </div>

                {task.priority && <em className={`popPriority ${task.priority.toLowerCase()}`}>{PRIORITY_LABEL[task.priority] ?? task.priority}</em>}

                <span className="popAvatars">
                  {assignees.length === 0 ? (
                    <UnassignedAvatar />
                  ) : (
                    <>
                      {assignees.slice(0, 3).map((user, index) => (
                        <UserAvatar key={`${user?.id ?? "x"}-${index}`} user={user} />
                      ))}
                      {assignees.length > 3 && <small>+{assignees.length - 3}</small>}
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="popSection">
        <h4>
          <span>일정</span>
          <span>{events.length}</span>
        </h4>

        {events.length === 0 ? (
          <p className="popEmpty">등록된 일정이 없어요.</p>
        ) : (
          events.map((event) => {
            const start = new Date(event.start_datetime);
            // end_datetime이 ""(빈 문자열)일 수도 있어서 truthy 검사로 "없음"을 판단해요.
            const end = event.end_datetime ? new Date(event.end_datetime) : null;
            const isMultiDay = end && start.toDateString() !== end.toDateString();

            return (
              <div
                className="popEvent"
                key={event.event_id}
                role="button"
                tabIndex={0}
                title="자세히 보기"
                onClick={() => onOpenEvent?.(event)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenEvent?.(event);
                  }
                }}
              >
                <i style={{ background: calendarColor(event.color) }} />

                <div>
                  <b>{event.title}</b>
                  {event.description && <p>{event.description}</p>}
                  <small>
                    {isMultiDay
                      ? `${formatShortDate(start)} ${formatTime(start)} ~ ${formatShortDate(end)} ${formatTime(end)}`
                      : `${formatTime(start)}${end ? ` ~ ${formatTime(end)}` : ""}`}
                  </small>
                </div>
              </div>
            );
          })
        )}

        <button type="button" className="popAddBtn" onClick={onAddEvent}>
          <Plus size={14} /> 이 날 일정 추가
        </button>
      </div>
    </div>
  );
}
