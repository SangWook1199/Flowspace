import { useMemo, useState } from "react";
import CalendarToolbar from "../components/calendar/CalendarToolbar";
import SprintTimeline from "../components/calendar/SprintTimeline";
import CalendarGrid from "../components/calendar/CalendarGrid";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import "../styles/calendar.css";

/* ---------- Mock Data ---------- */

const sprint = {
  id: 1,
  name: "Sprint 1",
  start: "2026-09-01",
  end: "2026-09-14",
  progress: 72,
  dday: 5,
};

const events = [
  {
    id: 1,
    type: "task",
    title: "JWT 로그인 API 구현",
    start: "2026-09-09",
    end: "2026-09-11",
    color: "blue",
    assignee: "상욱",
    status: "진행중",
  },
  {
    id: 2,
    type: "task",
    title: "Sprint UI 디자인",
    start: "2026-09-09",
    end: "2026-09-18",
    color: "yellow",
    assignee: "서연",
    status: "예정",
  },
  {
    id: 3,
    type: "task",
    title: "대시보드 퍼블리싱",
    start: "2026-09-09",
    end: "2026-09-16",
    color: "green",
    assignee: "지민",
    status: "진행중",
  },
  {
    id: 4,
    type: "meeting",
    title: "주간 스크럼",
    start: "2026-09-08",
    end: "2026-09-08",
    time: "09:30",
    color: "purple",
  },
  {
    id: 5,
    type: "meeting",
    title: "OAuth 연동 회의",
    start: "2026-09-04",
    end: "2026-09-04",
    time: "10:00",
    color: "purple",
  },
  {
    id: 6,
    type: "milestone",
    title: "중간 발표",
    start: "2026-09-12",
    end: "2026-09-12",
    time: "14:00",
    color: "pink",
  },
];

/* ---------- Calendar Page ---------- */

export default function Calendar() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const [selectedDate, setSelectedDate] = useState(today);

  const monthLabel = useMemo(
    () => `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`,
    [currentMonth],
  );

  /* ---------- Month Navigation ---------- */

  const prevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const goToday = () => {
    const today = new Date();

    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));

    setSelectedDate(today);
  };

  return (
    <div className="calendar-page">
      <CalendarToolbar
        monthLabel={monthLabel}
        onPrev={prevMonth}
        onNext={nextMonth}
        onToday={goToday}
      />

      <SprintTimeline sprint={sprint} />

      <div className="calendar-layout">
        <CalendarGrid
          currentMonth={currentMonth}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={setCurrentMonth}
        />

        <CalendarSidebar
          sprint={sprint}
          events={events}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
