import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import CalendarRail from "../components/calendar/CalendarRail";
import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarGrid from "../components/calendar/CalendarGrid";
import DayPopover from "../components/calendar/DayPopover";
import EventModal from "../components/calendar/EventModal";
import EventDetail from "../components/calendar/EventDetail";

import * as eventApi from "../api/events";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { toDateKey, todayKey, parseDateKey, inclusiveDays } from "../utils/date";
import { isCalendarSprint, pickInitialSprint } from "../utils/calendarSprint";
import { isEventOnDate, sortEventsByStart } from "../utils/calendarRange";
import { compareDayTasks } from "../utils/calendarTaskOrder";

// 달력에 보이는 것(작업/일정/완료된 작업/긴 작업)을 껐다 켜는 설정이에요. 브라우저에 기억해둬요.
// 기간이 긴 작업은 스프린트 내내 이어지는 막대가 달력을 덮어서 기본은 숨겨요(왼쪽 레일에서 켤 수 있어요).
const VIEW_KEY = "flowspace.calendar.view";
const DEFAULT_VIEW = { tasks: true, events: true, done: true, long: false };
const LONG_TASK_DAYS = 7;

// 작업 페이지에 갔다가 돌아와도 보던 스프린트와 날짜가 그대로이도록, 탭이 열려 있는 동안만 기억해둬요.
const stateKey = (workspaceId) => `flowspace.calendar.state.${workspaceId}`;

const loadState = (workspaceId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(stateKey(workspaceId)));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
};

const saveState = (workspaceId, state) => {
  try {
    sessionStorage.setItem(stateKey(workspaceId), JSON.stringify(state));
  } catch {
    // 저장하지 못해도 화면은 그대로 동작해요.
  }
};

const loadView = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY));
    return saved && typeof saved === "object" ? { ...DEFAULT_VIEW, ...saved } : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
};

const saveView = (view) => {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // 저장하지 못해도 화면은 그대로 동작해요.
  }
};

const isLongTask = (task) => inclusiveDays(task.start, task.end) > LONG_TASK_DAYS;

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

// 공용 작업 → 캘린더가 쓰는 작업 모양. 날짜가 없는 작업은 달력에 올릴 수 없어서 빼요.
const toCalendarTask = (task, statusById) => {
  const status = statusById[task.statusId];
  const subtasks = task.subtasks ?? [];

  return {
    id: task.id,
    sprintId: task.sprintId,
    code: task.code ?? task.id,
    title: task.title,
    assignees: task.assignees ?? [],
    start: task.startDate,
    // 마감일이 없거나 시작일보다 앞서면 하루짜리로 보여요.
    end: task.dueDate && task.dueDate >= task.startDate ? task.dueDate : task.startDate,
    status: {
      id: task.statusId,
      name: status?.name ?? task.statusName,
      color: status?.color ?? "GRAY",
      category: status?.category,
    },
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

  // 돌아왔을 때를 위해 기억해둔 값(보던 스프린트/날짜)이에요. 사라진 스프린트나 잘못된 날짜는 쓰지 않아요.
  const [saved] = useState(() => {
    const state = loadState(workspaceId);
    const sprintOk = calendarSprints.some((s) => s.id === state.sprintId && isCalendarSprint(s));

    return {
      sprintId: sprintOk ? state.sprintId : null,
      date: typeof state.date === "string" && parseDateKey(state.date) ? state.date : null,
    };
  });

  // 기본으로 보여줄 스프린트: 기억해둔 것 → "진행 중" 상태인 스프린트(오늘이 기간에 든 것 먼저) → 가까운 예정/최근 스프린트.
  const [selectedSprint, setSelectedSprint] = useState(
    () => saved.sprintId ?? pickInitialSprint(calendarSprints, today)?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = useState(saved.date ?? today);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = parseDateKey(saved.date ?? today) ?? new Date();
    return firstOfMonth(base.getFullYear(), base.getMonth());
  });

  // 일정은 보고 있는 달(앞뒤 한 달 포함)을 월별로 받아서 기억해요(이미 받은 달은 다시 받지 않아요).
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const {
    events,
    error: eventsError,
    failedCount,
    retry: retryEvents,
    addEvent,
    replaceEvent,
    removeEvent,
  } = useCalendarEvents(workspaceId, year, month);

  useEffect(() => {
    saveState(workspaceId, { sprintId: selectedSprint, date: selectedDate });
  }, [workspaceId, selectedSprint, selectedDate]);

  const mainRef = useRef(null);
  const [view, setView] = useState(loadView);
  const [railOpen, setRailOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 1200);
  // 날짜를 누르면 그 칸 옆에 상세 패널이 떠요.
  const [detailOpen, setDetailOpen] = useState(false);
  // 열려 있는 창: { type: "create" } | { type: "detail", id } | { type: "edit", id }
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

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

  // 표시 설정(완료된 작업/긴 작업/작업 자체)을 적용한 작업만 달력 칸에 올려요. 상세 패널에는 전부 보여줘요.
  const gridTasks = useMemo(
    () =>
      view.tasks
        ? calendarTasks.filter(
            (task) => (view.done || task.status.category !== "DONE") && (view.long || !isLongTask(task)),
          )
        : [],
    [calendarTasks, view],
  );

  const hiddenLongCount = useMemo(
    () =>
      view.tasks
        ? calendarTasks.filter((task) => (view.done || task.status.category !== "DONE") && isLongTask(task)).length
        : 0,
    [calendarTasks, view.tasks, view.done],
  );

  const toggleView = (key) => {
    setView((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveView(next);
      return next;
    });
  };

  const todayTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => selectedDate >= task.start && selectedDate <= task.end)
        .sort(compareDayTasks),
    [calendarTasks, selectedDate],
  );

  // 지금 열어 본 일정(수정하면 목록의 새 값으로 바뀌어요). 지워졌으면 없어서 창이 닫혀요.
  const openedEvent = useMemo(
    () => (modal?.id == null ? null : (events.find((event) => event.event_id === modal.id) ?? null)),
    [events, modal],
  );

  const todayEvents = useMemo(
    () =>
      sortEventsByStart(
        events.filter((event) => isEventOnDate(event, selectedDate)),
      ),
    [events, selectedDate],
  );

  const moveMonth = (diff) => {
    const next = firstOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + diff,
    );

    setCurrentMonth(next);
    setSelectedDate((prev) => pickDateForMonth(next, prev, today));
    setDetailOpen(false);
  };

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setDetailOpen(true);
  };

  // 미니 달력에서 날짜를 누르면(다른 달 날짜면 그 달로 옮기고) 그 날 상세를 열어요.
  const selectFromMini = (date) => {
    if (!date.isCurrentMonth) setCurrentMonth(firstOfMonth(date.year, date.month));
    selectDate(date.full);
  };

  // 스프린트를 바꾸면, 지금 보는 달이 그 스프린트 기간과 겹치지 않을 때 스프린트가 시작하는 달로 같이 옮겨요
  // (달력에 아무 작업도 안 보이는 채로 스프린트만 바뀌지 않게요).
  const changeSprint = (id) => {
    setSelectedSprint(id);

    const picked = calendarSprints.find((s) => s.id === id);
    if (!picked?.startDate || !picked?.endDate) return;

    const monthStart = toDateKey(currentMonth);
    const monthEnd = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
    if (picked.startDate <= monthEnd && picked.endDate >= monthStart) return;

    const base = parseDateKey(picked.startDate);
    if (!base) return;
    setCurrentMonth(firstOfMonth(base.getFullYear(), base.getMonth()));
    setSelectedDate(picked.startDate);
    setDetailOpen(false);
  };

  const goToday = () => {
    const base = parseDateKey(today) ?? new Date();
    setCurrentMonth(firstOfMonth(base.getFullYear(), base.getMonth()));
    setSelectedDate(today);
    setDetailOpen(false);
  };

  const openCreateModal = () => {
    setDetailOpen(false);
    setModal({ type: "create" });
  };

  // 달력의 일정이나 날짜 상세의 일정을 누르면 그 일정의 자세한 내용(설명 포함)을 보여줘요.
  const openEvent = (event) => {
    setDetailOpen(false);
    setModal({ type: "detail", id: event.event_id });
  };

  // 서버에 저장하고 달력에 바로 보여줘요. 실패하면 오류를 그대로 던져서 창이 안에 보여줘요.
  const createEvent = async (form) => {
    addEvent(await eventApi.createEvent(workspaceId, form));
  };

  const updateEvent = async (id, form) => {
    replaceEvent(await eventApi.updateEvent(id, form));
  };

  const deleteEvent = async (event) => {
    await eventApi.deleteEvent(event.event_id);
    removeEvent(event.event_id);
  };

  // 팝오버의 작업을 누르면 작업 페이지로 가서 그 작업이 선택된 채로 열려요.
  const openTask = (task) => navigate(`/sprints/${task.sprintId}/tasks?task=${task.id}`);

  return (
    <div className="calendarPage">
      <div className={`calendarApp${railOpen ? "" : " railClosed"}`}>
        {railOpen && (
          <CalendarRail
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            today={today}
            events={events}
            sprint={sprint}
            sprintList={calendarSprints}
            onSprintChange={changeSprint}
            view={view}
            onToggleView={toggleView}
            hiddenLongCount={hiddenLongCount}
            onPrevMonth={() => moveMonth(-1)}
            onNextMonth={() => moveMonth(1)}
            onSelectDate={selectFromMini}
            onAddEvent={openCreateModal}
          />
        )}

        <div className="calendarMain" ref={mainRef}>
          <CalendarToolbar
            currentMonth={currentMonth}
            today={today}
            sprint={sprint}
            railOpen={railOpen}
            onToggleRail={() => setRailOpen((prev) => !prev)}
            onPrevMonth={() => moveMonth(-1)}
            onNextMonth={() => moveMonth(1)}
            onToday={goToday}
          />

          {eventsError && (
            <p className="emptyText calendarError" role="alert">
              {failedCount > 1 ? "일부 달의 일정을 불러오지 못했어요." : "일정을 불러오지 못했어요."} {eventsError}{" "}
              <button type="button" className="toolbarBtn" onClick={retryEvents}>
                다시 시도
              </button>
            </p>
          )}

          <CalendarGrid
            currentMonth={currentMonth}
            tasks={gridTasks}
            events={view.events ? events : []}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={selectDate}
            onMonthChange={setCurrentMonth}
            onOpenEvent={openEvent}
          />

          {detailOpen && (
            <DayPopover
              date={selectedDate}
              today={today}
              tasks={todayTasks}
              events={todayEvents}
              containerRef={mainRef}
              onClose={() => setDetailOpen(false)}
              onAddEvent={openCreateModal}
              onOpenTask={openTask}
              onOpenEvent={openEvent}
            />
          )}
        </div>
      </div>

      {modal?.type === "create" && (
        <EventModal initialDate={selectedDate} onClose={() => setModal(null)} onSubmit={createEvent} />
      )}

      {modal?.type === "detail" && openedEvent && (
        <EventDetail
          event={openedEvent}
          onClose={() => setModal(null)}
          onEdit={(event) => setModal({ type: "edit", id: event.event_id })}
          onDelete={deleteEvent}
        />
      )}

      {modal?.type === "edit" && openedEvent && (
        <EventModal
          event={openedEvent}
          onClose={() => setModal({ type: "detail", id: openedEvent.event_id })}
          onSubmit={(form) => updateEvent(openedEvent.event_id, form)}
        />
      )}
    </div>
  );
}
