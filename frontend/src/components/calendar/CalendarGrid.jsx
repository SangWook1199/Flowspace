import CalendarEventBar from "./CalendarEventBar";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarGrid({
  currentMonth,
  events,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1;

    if (day <= 0) {
      cells.push({
        day: prevMonthDays + day,
        current: false,
        date: new Date(year, month - 1, prevMonthDays + day),
      });
    } else if (day > daysInMonth) {
      cells.push({
        day: day - daysInMonth,
        current: false,
        date: new Date(year, month + 1, day - daysInMonth),
      });
    } else {
      cells.push({
        day,
        current: true,
        date: new Date(year, month, day),
      });
    }
  }

  /* ---------- Event Layer ---------- */

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const bars = events.map((event, index) => {
    const startIndex = cells.findIndex(
      (cell) => formatDate(cell.date) === event.start,
    );

    const endIndex = cells.findIndex(
      (cell) => formatDate(cell.date) === event.end,
    );

    return {
      ...event,
      week: Math.floor(startIndex / 7),
      column: (startIndex % 7) + 1,
      span: endIndex - startIndex + 1,
      row: index % 3,
    };
  });

  return (
    <section className="calendar-grid">
      {/* 요일 */}
      <div className="calendar-grid__header">
        {weekDays.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 */}
      <div className="calendar-grid__body">
        {cells.map((cell, index) => {
          const selected = formatDate(cell.date) === formatDate(selectedDate);

          return (
            <div
              key={index}
              className={`calendar-cell ${selected ? "selected" : ""} ${
                !cell.current ? "muted" : ""
              }`}
              onClick={() => {
                onSelectDate(cell.date);

                if (!cell.current) {
                  onChangeMonth(
                    new Date(cell.date.getFullYear(), cell.date.getMonth(), 1),
                  );
                }
              }}
            >
              <span
                className={`calendar-day ${
                  cell.date.getDay() === 0 ? "sunday" : ""
                }`}
              >
                {cell.day}
              </span>
            </div>
          );
        })}

        {/* 기간 막대 레이어 */}
        <div className="calendar-event-layer">
          {bars.map((bar) => (
            <CalendarEventBar key={bar.id} event={bar} />
          ))}
        </div>
      </div>
    </section>
  );
}
