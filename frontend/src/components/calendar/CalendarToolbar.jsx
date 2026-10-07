import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";

import { calendarColor } from "../../utils/calendarColors";
import { swatchStyle } from "../../utils/color";
import { getSprintPhase } from "../../utils/sprintRange";
import { SPRINT_STATUS } from "../../utils/calendarSprint";

// 지금 보는 스프린트의 상태 뱃지 글자예요. 서버 상태(진행 중/계획됨/완료됨)를 먼저 보여주고,
// 진행 중이고 기간 안이면 남은 날(D-n)을 덧붙여요.
const sprintStatusText = (sprint, today) => {
  const meta = SPRINT_STATUS[sprint.status];
  if (!meta) return "";

  if (sprint.status === "ACTIVE") {
    const info = getSprintPhase(sprint, today);
    if (info.phase === "during") return `${meta.label} · ${info.daysLeft === 0 ? "D-Day" : `D-${info.daysLeft}`}`;
  }

  return meta.label;
};

// 달력 위쪽 바: 달 이동과 오늘 버튼, 지금 보는 스프린트 표시, 레일 접기 버튼이에요.
export default function CalendarToolbar({
  currentMonth,
  today,
  sprint,
  railOpen,
  onToggleRail,
  onPrevMonth,
  onNextMonth,
  onToday,
}) {
  const monthText = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  return (
    <header className="calendarToolbar">
      <button
        type="button"
        className="iconBtn"
        aria-label={railOpen ? "왼쪽 패널 접기" : "왼쪽 패널 펼치기"}
        aria-pressed={railOpen}
        onClick={onToggleRail}
      >
        <PanelLeft size={16} />
      </button>

      <h2>{monthText}</h2>

      <button type="button" className="iconBtn" aria-label="이전 달" onClick={onPrevMonth}>
        <ChevronLeft size={16} />
      </button>
      <button type="button" className="iconBtn" aria-label="다음 달" onClick={onNextMonth}>
        <ChevronRight size={16} />
      </button>
      <button type="button" className="toolbarBtn" onClick={onToday}>
        오늘
      </button>

      {sprint && (
        <span className="sprintTag" title={`${sprint.startDate} ~ ${sprint.endDate}`}>
          <i style={swatchStyle(calendarColor(sprint.color))} />
          {sprint.name}
          <small className={`sprintState ${String(sprint.status).toLowerCase()}`}>{sprintStatusText(sprint, today)}</small>
        </span>
      )}
    </header>
  );
}
