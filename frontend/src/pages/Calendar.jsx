import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarSprintBanner from "../components/calendar/CalendarSprintBanner";
import CalendarGrid from "../components/calendar/CalendarGrid";
import DaySidebar from "../components/calendar/DaySidebar";

import {
  calendarSprints,
  calendarTasks,
  calendarEvents,
} from "../mock/calendar";

const EVENT_COLORS = [
  "BLUE",
  "PURPLE",
  "GREEN",
  "RED",
  "ORANGE",
  "PINK",
  "GRAY",
];

export default function Calendar() {
  const TODAY = new Date();

  const [selectedSprint, setSelectedSprint] = useState(1);
  const [selectedDate, setSelectedDate] = useState(formatDate(TODAY));
  const [currentMonth, setCurrentMonth] = useState(
    new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  );

  const [events, setEvents] = useState(calendarEvents);
  const [openModal, setOpenModal] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_datetime: `${formatDate(TODAY)}T09:00`,
    end_datetime: `${formatDate(TODAY)}T10:00`,
    color: "PURPLE",
  });

  const sprint = useMemo(
    () => calendarSprints.find((s) => s.id === selectedSprint),
    [selectedSprint],
  );

  const sprintTasks = useMemo(
    () => calendarTasks.filter((t) => t.sprintId === selectedSprint),
    [selectedSprint],
  );

  const todayTasks = useMemo(
    () =>
      sprintTasks.filter(
        (task) => selectedDate >= task.start && selectedDate <= task.end,
      ),
    [sprintTasks, selectedDate],
  );

  const todayEvents = useMemo(
    () =>
      events.filter((event) => {
        const start = event.start_datetime.slice(0, 10);
        const end = (event.end_datetime ?? event.start_datetime).slice(0, 10);

        return selectedDate >= start && selectedDate <= end;
      }),
    [events, selectedDate],
  );

  const moveMonth = (diff) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + diff);
    setCurrentMonth(next);
  };

  const goToday = () => {
    setCurrentMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
    setSelectedDate(formatDate(TODAY));
  };

  const createEvent = () => {
    if (!newEvent.title.trim()) return;

    if (
      newEvent.end_datetime &&
      newEvent.end_datetime < newEvent.start_datetime
    ) {
      alert("종료 일시는 시작 일시보다 늦어야 합니다.");
      return;
    }

    setEvents((prev) => [
      ...prev,
      {
        event_id: Date.now(),
        workspace_id: 1,
        created_by: 1,
        title: newEvent.title,
        description: newEvent.description,
        color: newEvent.color,
        start_datetime: newEvent.start_datetime,
        end_datetime: newEvent.end_datetime || null,
      },
    ]);

    setOpenModal(false);

    setNewEvent({
      title: "",
      description: "",
      start_datetime: `${selectedDate}T09:00`,
      end_datetime: `${selectedDate}T10:00`,
      color: "PURPLE",
    });
  };

  return (
    <div className="calendarPage">
      <header className="calendarHeader">
        <div>
          <h1>캘린더</h1>
          <p>작업과 일정을 한눈에 확인하고 관리하세요.</p>
        </div>

        <button
          className="primaryBtn"
          onClick={() => {
            setNewEvent({
              title: "",
              description: "",
              start_datetime: `${selectedDate}T09:00`,
              end_datetime: `${selectedDate}T10:00`,
              color: "PURPLE",
            });
            setOpenModal(true);
          }}
        >
          <Plus size={16} />
          일정 추가
        </button>
      </header>

      <CalendarToolbar
        sprintList={calendarSprints}
        selectedSprint={selectedSprint}
        onSprintChange={setSelectedSprint}
        currentMonth={currentMonth}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onToday={goToday}
      />

      <CalendarSprintBanner sprint={sprint} />

      <div className="calendarContent">
        <CalendarGrid
          currentMonth={currentMonth}
          tasks={sprintTasks}
          events={events}
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
          <div className="scheduleModal" onClick={(e) => e.stopPropagation()}>
            <div className="scheduleModalHeader">
              <h2>새 일정</h2>

              <button className="closeBtn" onClick={() => setOpenModal(false)}>
                ✕
              </button>
            </div>

            <div className="scheduleModalBody">
              <div className="field">
                <label>일정 제목</label>

                <input
                  placeholder="예) 팀 회의"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>설명</label>

                <textarea
                  rows={3}
                  placeholder="회의 내용 또는 메모"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>시작 일시</label>

                <input
                  type="datetime-local"
                  value={newEvent.start_datetime}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      start_datetime: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>종료 일시</label>

                <input
                  type="datetime-local"
                  value={newEvent.end_datetime}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      end_datetime: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>색상</label>

                <div className="colorPicker">
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`colorCircle ${color.toLowerCase()} ${
                        newEvent.color === color ? "active" : ""
                      }`}
                      onClick={() =>
                        setNewEvent({
                          ...newEvent,
                          color,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="scheduleModalFooter">
              <button className="cancelBtn" onClick={() => setOpenModal(false)}>
                취소
              </button>

              <button className="saveBtn" onClick={createEvent}>
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}
