import { CalendarDays } from "lucide-react";

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const days =
    startDate && endDate
      ? Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1
      : 0;
  return (
    <section className="sprintDateBox">
      <label>
        기간 설정 <b>*</b>
      </label>
      <div className="dateFields">
        <div>
          <span>시작일</span>
          <p>
            <CalendarDays size={17} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChange("startDate", e.target.value)}
            />
          </p>
        </div>
        <i>~</i>
        <div>
          <span>종료일</span>
          <p>
            <CalendarDays size={17} />
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => onChange("endDate", e.target.value)}
            />
          </p>
        </div>
      </div>
      <small>
        <CalendarDays size={15} /> 총 {days || 0}일
      </small>
    </section>
  );
}
