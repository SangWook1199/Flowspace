import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarToolbar({
  sprintList = [],
  selectedSprint,
  onSprintChange,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}) {
  const monthText = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  return (
    <section className="calendarToolbar">
      <div className="toolbarLeft">
        <button className="iconBtn" aria-label="이전 달" onClick={onPrevMonth}>
          <ChevronLeft size={18} />
        </button>

        <h2>{monthText}</h2>

        <button className="iconBtn" aria-label="다음 달" onClick={onNextMonth}>
          <ChevronRight size={18} />
        </button>

        <button className="toolbarBtn" onClick={onToday}>
          오늘
        </button>
      </div>

      <div className="toolbarRight">
        <div className="sprintSelectWrap">
          <label htmlFor="calendarSprintSelect">스프린트</label>

          <select
            id="calendarSprintSelect"
            className="sprintSelect"
            value={selectedSprint}
            onChange={(e) => onSprintChange(Number(e.target.value))}
          >
            {sprintList.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
