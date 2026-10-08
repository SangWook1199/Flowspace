import { toDateKey } from "./date";

// 월 달력에 그릴 주 목록이에요. 일요일에 시작하고, 마지막 줄이 전부 다음 달 날짜면 그 줄은 빼서 5주짜리 달은 5줄이에요.
// 각 날짜: { day, full("YYYY-MM-DD"), isCurrentMonth, month(0~11), year }
export function buildMonthWeeks(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);

  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks = [];

  for (let w = 0; w < 6; w++) {
    const week = [];

    for (let d = 0; d < 7; d++) {
      const current = new Date(start);
      current.setDate(start.getDate() + w * 7 + d);

      week.push({
        day: current.getDate(),
        full: toDateKey(current),
        isCurrentMonth: current.getMonth() === month.getMonth(),
        month: current.getMonth(),
        year: current.getFullYear(),
      });
    }

    weeks.push(week);
  }

  if (weeks[5].every((day) => !day.isCurrentMonth)) weeks.pop();

  return weeks;
}
