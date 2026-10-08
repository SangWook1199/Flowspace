// 캘린더가 쓰는 색 이름(서버의 색 8종) → #hex. 작업 상태 점, 일정 칩, 스프린트 점이 모두 같은 색 표를 써요.
export const CALENDAR_COLOR = {
  GRAY: "#64748B",
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  WHITE: "#FFFFFF",
};

export const calendarColor = (name, fallback = CALENDAR_COLOR.GRAY) => CALENDAR_COLOR[name] ?? fallback;
