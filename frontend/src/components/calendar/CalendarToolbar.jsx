import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
} from "lucide-react";

export default function CalendarToolbar({
  monthLabel,
  onPrev,
  onNext,
  onToday,
}) {
  return (
    <>
      {/* ---------- Calendar Header ---------- */}
      <div className="calendar-header">
        <div>
          <h1>캘린더</h1>
          <p>작업과 일정을 한눈에 확인하고 관리하세요.</p>
        </div>

        <div className="calendar-actions">
          <button className="calendar-btn">
            <Calendar size={16} />
            월간
          </button>

          <button className="calendar-btn calendar-btn--active">
            <span className="status-dot" />
            Sprint 1 (진행 중)
          </button>

          <button className="calendar-btn">
            <Filter size={16} />
            필터
          </button>

          <button className="calendar-add">
            <Plus size={16} />
            추가
          </button>
        </div>
      </div>

      {/* ---------- Month Navigation ---------- */}
      <div className="calendar-monthbar">
        <div className="calendar-monthbar__left">
          <button className="calendar-btn" onClick={onToday}>
            오늘
          </button>

          <div className="calendar-nav">
            <button onClick={onPrev}>
              <ChevronLeft size={18} />
            </button>

            <button onClick={onNext}>
              <ChevronRight size={18} />
            </button>
          </div>

          <h2>{monthLabel}</h2>
        </div>
      </div>
    </>
  );
}
