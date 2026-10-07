import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useOutletContext } from "react-router-dom";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarSprintBanner from "../components/calendar/CalendarSprintBanner";
import CalendarGrid from "../components/calendar/CalendarGrid";
import DaySidebar from "../components/calendar/DaySidebar";

import * as eventApi from "../api/events";
import { useRequest } from "../hooks/useRequest";
import { getErrorMessage } from "../utils/apiError";
import { toDateKey, todayKey, parseDateKey } from "../utils/date";
import { pickCurrentSprint } from "../utils/sprintRange";
import { isEventOnDate, sortEventsByStart } from "../utils/calendarRange";

const EVENT_COLORS = [
  "WHITE",
  "BLUE",
  "PURPLE",
  "GREEN",
  "RED",
  "ORANGE",
  "PINK",
  "GRAY",
];

// 색상 버튼은 색만 있어서 스크린리더가 읽을 이름이 없어요. 그래서 aria-label용 한글 이름을 따로 둬요.
const COLOR_LABEL = {
  BLUE: "파랑",
  PURPLE: "보라",
  GREEN: "초록",
  RED: "빨강",
  ORANGE: "주황",
  PINK: "분홍",
  GRAY: "회색",
  WHITE: "흰색",
};

// 그 달 1일의 Date. setMonth로 달을 옮기면 31일 같은 날짜가 다음 달로 넘쳐서(1/31 + 1달 = 3/3),
// 항상 "연, 월, 1일"로 새로 만들어요.
const firstOfMonth = (year, monthIndex) => new Date(year, monthIndex, 1);

// 달을 옮긴 뒤 선택할 날짜: 기존 선택이 새 달 안이면 그대로, 아니면 오늘이 그 달에 있을 때 오늘, 아니면 1일이에요.
// (달만 바뀌고 선택 날짜는 옛 달에 남아 있으면 사이드바와 선택 표시가 화면의 달과 어긋나요.)
const pickDateForMonth = (monthDate, selectedDate, today) => {
  const prefix = toDateKey(monthDate).slice(0, 7);

  if (selectedDate.startsWith(prefix)) return selectedDate;
  if (today.startsWith(prefix)) return today;
  return `${prefix}-01`;
};

const createEmptyEvent = (dateKey) => ({
  title: "",
  description: "",
  start_datetime: `${dateKey}T09:00`,
  end_datetime: `${dateKey}T10:00`,
  color: "PURPLE",
});

// 공용 작업 → 캘린더가 쓰는 작업 모양. 날짜가 없는 작업은 달력에 올릴 수 없어서 빼요.
const toCalendarTask = (task, statusById) => {
  const status = statusById[task.statusId];
  const subtasks = task.subtasks ?? [];

  return {
    id: task.id,
    sprintId: task.sprintId,
    code: task.code ?? task.id,
    title: task.title,
    assignee: (task.assignees ?? []).map((a) => a.name).join(", "),
    start: task.startDate,
    // 마감일이 없거나 시작일보다 앞서면 하루짜리로 보여요.
    end: task.dueDate && task.dueDate >= task.startDate ? task.dueDate : task.startDate,
    status: { id: task.statusId, name: status?.name ?? task.statusName, color: status?.color ?? "GRAY" },
    priority: task.priority,
    complete: subtasks.filter((s) => s.checked).length,
    total: subtasks.length,
  };
};

// 스프린트·작업은 서버에서 불러와 MainLayout이 내려줘요. 다 불러온 뒤에 본문(CalendarBody)을 그려서
// "기본으로 보여줄 스프린트"를 처음부터 올바르게 고를 수 있어요.
export default function Calendar() {
  const { sprintDataLoading, sprintDataError, reloadSprintData } = useOutletContext();

  if (sprintDataLoading || sprintDataError) {
    return (
      <div className="calendarPage">
        {sprintDataLoading ? (
          <p className="emptyText" role="status">캘린더를 불러오는 중이에요…</p>
        ) : (
          <div role="alert">
            <p className="emptyText">{sprintDataError}</p>
            <button type="button" className="toolbarBtn" onClick={reloadSprintData}>
              다시 시도
            </button>
          </div>
        )}
      </div>
    );
  }

  return <CalendarBody />;
}

function CalendarBody() {
  const { workspaceId, sprints, sprintTasks, taskStatuses } = useOutletContext();

  // "오늘"은 처음 렌더링할 때 한 번만 정해요. 렌더링마다 새로 구하면 자정을 넘기는 순간 선택 날짜와 어긋나요.
  const [today] = useState(todayKey);

  // 배너의 색은 서버 색 이름(BLUE 등)을 읽어서, 스프린트의 colorCode를 color로 넘겨줘요.
  const calendarSprints = useMemo(() => sprints.map((s) => ({ ...s, color: s.colorCode })), [sprints]);

  // 기본으로 보여줄 스프린트: 오늘이 기간에 들어가는 스프린트 → 없으면 가장 가까운 예정/최근 스프린트 → 없으면 첫 번째.
  const [selectedSprint, setSelectedSprint] = useState(
    () => pickCurrentSprint(calendarSprints, today)?.id ?? calendarSprints[0]?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = parseDateKey(today) ?? new Date();
    return firstOfMonth(base.getFullYear(), base.getMonth());
  });

  // 일정은 보고 있는 달(앞뒤 한 달 포함)을 서버에서 받아요. 달을 옮기면 다시 받아요.
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const {
    data: events,
    error: eventsError,
    setData: setEvents,
  } = useRequest(() => eventApi.getEventsAround(workspaceId, year, month), [workspaceId, year, month], {
    initialData: [],
  });
  const [openModal, setOpenModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newEvent, setNewEvent] = useState(() => createEmptyEvent(today));

  // 스프린트를 못 찾으면 undefined예요. 아래 배너/사이드바가 undefined를 받아도 안 깨지게 처리해뒀어요.
  const sprint = useMemo(
    () => calendarSprints.find((s) => s.id === selectedSprint),
    [calendarSprints, selectedSprint],
  );

  // 선택한 스프린트의 작업만 달력에 올려요(작업 자체는 칸반·작업 목록과 같은 데이터예요).
  const calendarTasks = useMemo(() => {
    const statusById = Object.fromEntries(taskStatuses.map((s) => [s.id, s]));

    return sprintTasks
      .filter((task) => task.sprintId === selectedSprint && task.startDate)
      .map((task) => toCalendarTask(task, statusById));
  }, [sprintTasks, taskStatuses, selectedSprint]);

  const todayTasks = useMemo(
    () =>
      calendarTasks.filter(
        (task) => selectedDate >= task.start && selectedDate <= task.end,
      ),
    [calendarTasks, selectedDate],
  );

  const todayEvents = useMemo(
    () =>
      sortEventsByStart(
        events.filter((event) => isEventOnDate(event, selectedDate)),
      ),
    [events, selectedDate],
  );

  // 모달이 열려 있는 동안 Esc로 닫을 수 있게 해요(키보드만 쓰는 사용자가 모달에 갇히지 않게).
  useEffect(() => {
    if (!openModal) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpenModal(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openModal]);

  const moveMonth = (diff) => {
    const next = firstOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + diff,
    );

    setCurrentMonth(next);
    setSelectedDate((prev) => pickDateForMonth(next, prev, today));
  };

  const goToday = () => {
    const base = parseDateKey(today) ?? new Date();
    setCurrentMonth(firstOfMonth(base.getFullYear(), base.getMonth()));
    setSelectedDate(today);
  };

  const openCreateModal = () => {
    setNewEvent(createEmptyEvent(selectedDate));
    setFormError("");
    setOpenModal(true);
  };

  const updateNewEvent = (patch) => {
    setNewEvent((prev) => ({ ...prev, ...patch }));
    setFormError("");
  };

  const createEvent = async () => {
    if (saving) return;

    const title = newEvent.title.trim();

    // 저장을 막는 이유를 alert 대신 모달 안에 보여줘요(alert는 화면 흐름을 끊고 접근성도 나빠요).
    if (!title) {
      setFormError("일정 제목을 입력해 주세요.");
      return;
    }

    if (!newEvent.start_datetime) {
      setFormError("시작 일시를 입력해 주세요.");
      return;
    }

    // "YYYY-MM-DDTHH:mm" 문자열은 사전순 비교가 곧 시간순이라 날짜와 시각을 한 번에 비교할 수 있어요.
    if (
      newEvent.end_datetime &&
      newEvent.end_datetime < newEvent.start_datetime
    ) {
      setFormError("종료 일시는 시작 일시보다 빠를 수 없어요.");
      return;
    }

    // datetime-local을 지우면 ""가 와서 ?? 로는 못 걸러요. 서버 요청을 만들 때 ||로 빈 값을 null로 바꿔요.
    setSaving(true);

    try {
      const created = await eventApi.createEvent(workspaceId, { ...newEvent, title });
      setEvents((prev) => [...(prev ?? []), created]);

      setOpenModal(false);
      setFormError("");
      setNewEvent(createEmptyEvent(selectedDate));
    } catch (err) {
      setFormError(getErrorMessage(err, "일정을 만들지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="calendarPage">
      <header className="calendarHeader">
        <div>
          <h1>캘린더</h1>
          <p>작업과 일정을 한눈에 확인하고 관리하세요.</p>
        </div>

        <button className="primaryBtn" onClick={openCreateModal}>
          <Plus size={16} />
          일정 추가
        </button>
      </header>

      <CalendarToolbar
        sprintList={calendarSprints}
        selectedSprint={selectedSprint ?? ""}
        onSprintChange={setSelectedSprint}
        currentMonth={currentMonth}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onToday={goToday}
      />

      <CalendarSprintBanner sprint={sprint} today={today} />

      {eventsError && (
        <p className="emptyText" role="alert" style={{ color: "#ef4444" }}>
          일정을 불러오지 못했어요. {eventsError}
        </p>
      )}

      <div className="calendarContent">
        <CalendarGrid
          currentMonth={currentMonth}
          tasks={calendarTasks}
          events={events ?? []}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onMonthChange={setCurrentMonth}
        />

        <DaySidebar
          date={selectedDate}
          sprint={sprint}
          tasks={todayTasks}
          events={todayEvents}
        />
      </div>

      {openModal && (
        <div className="modalOverlay" onClick={() => setOpenModal(false)}>
          <div
            className="scheduleModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scheduleModalTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scheduleModalHeader">
              <h2 id="scheduleModalTitle">새 일정</h2>

              <button
                className="closeBtn"
                aria-label="닫기"
                onClick={() => setOpenModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="scheduleModalBody">
              <div className="field">
                <label htmlFor="eventTitle">일정 제목</label>

                <input
                  id="eventTitle"
                  autoFocus
                  placeholder="예) 팀 회의"
                  value={newEvent.title}
                  onChange={(e) => updateNewEvent({ title: e.target.value })}
                />
              </div>

              <div className="field">
                <label htmlFor="eventDescription">설명</label>

                <textarea
                  id="eventDescription"
                  rows={3}
                  placeholder="회의 내용 또는 메모"
                  value={newEvent.description}
                  onChange={(e) =>
                    updateNewEvent({ description: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="eventStart">시작 일시</label>

                <input
                  id="eventStart"
                  type="datetime-local"
                  value={newEvent.start_datetime}
                  onChange={(e) =>
                    updateNewEvent({ start_datetime: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="eventEnd">종료 일시</label>

                <input
                  id="eventEnd"
                  type="datetime-local"
                  value={newEvent.end_datetime}
                  onChange={(e) =>
                    updateNewEvent({ end_datetime: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label id="eventColorLabel">색상</label>

                <div
                  className="eventColorPicker"
                  role="group"
                  aria-labelledby="eventColorLabel"
                >
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={COLOR_LABEL[color]}
                      aria-pressed={newEvent.color === color}
                      className={`eventColorCircle ${color.toLowerCase()} ${
                        newEvent.color === color ? "active" : ""
                      }`}
                      onClick={() => updateNewEvent({ color })}
                    />
                  ))}
                </div>
              </div>

              {formError && (
                <p
                  className="emptyText"
                  role="alert"
                  style={{ color: "#ef4444" }}
                >
                  {formError}
                </p>
              )}
            </div>

            <div className="scheduleModalFooter">
              <button className="cancelBtn" onClick={() => setOpenModal(false)}>
                취소
              </button>

              <button className="saveBtn" onClick={createEvent} disabled={saving}>
                {saving ? "저장 중…" : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
