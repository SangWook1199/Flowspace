import { CalendarDays } from "lucide-react";

import { inclusiveDays, isRangeReversed } from "../../utils/date";

// onChange(key, value)는 부모(SprintForm)의 update와 같은 모양이에요. 시작일을 종료일보다 늦게
// 옮기면 종료일도 시작일로 같이 끌고 가고(기간이 뒤집히지 않게), 종료일을 시작일보다 앞으로
// 직접 입력한 경우엔 값은 그대로 두되 메시지를 보여줘요(부모가 같은 검사로 제출을 막아요).
export default function DateRangePicker({ startDate, endDate, onChange }) {
  const reversed = isRangeReversed(startDate, endDate);
  // 순서가 뒤집혔거나 비어 있으면 0일이에요(음수가 나오지 않아요).
  const days = inclusiveDays(startDate, endDate);

  const changeStart = (value) => {
    onChange("startDate", value);
    if (value && isRangeReversed(value, endDate)) onChange("endDate", value);
  };

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
              aria-label="시작일"
              value={startDate}
              onChange={(e) => changeStart(e.target.value)}
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
              aria-label="종료일"
              min={startDate}
              value={endDate}
              aria-invalid={reversed ? "true" : undefined}
              onChange={(e) => onChange("endDate", e.target.value)}
            />
          </p>
        </div>
      </div>
      <small>
        <CalendarDays size={15} /> 총 {days}일
      </small>
      {reversed && (
        <small role="alert" style={{ color: "#dc2626", marginTop: 8 }}>
          종료일은 시작일보다 빠를 수 없어요.
        </small>
      )}
    </section>
  );
}
