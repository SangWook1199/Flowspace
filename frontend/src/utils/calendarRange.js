// 캘린더 일정(event)의 날짜 범위 계산 — 달력 칸과 오른쪽 사이드바가 "이 날짜에 걸친 일정"을 각자 계산하면
// 빈 문자열 end_datetime("")을 처리하는 방식이 달라져서 한쪽에서만 일정이 사라지는 일이 생겨요.
// 그래서 같은 규칙(끝이 비었으면 시작일 하루짜리, 끝이 시작보다 앞서면 시작일로 보정)을 여기 한 곳에 뒀어요.

// 일정이 걸친 날짜 범위 {start, end} ("YYYY-MM-DD"). 시작이 없으면 빈 문자열이라 어떤 날짜와도 안 겹쳐요.
export const getEventDayRange = (event) => {
  const start = (event?.start_datetime || "").slice(0, 10);
  const end = (event?.end_datetime || event?.start_datetime || "").slice(0, 10);

  return { start, end: end < start ? start : end };
};

// dateKey("YYYY-MM-DD") 날짜에 일정이 걸쳐 있으면 true.
export const isEventOnDate = (event, dateKey) => {
  const { start, end } = getEventDayRange(event);
  return Boolean(start) && dateKey >= start && dateKey <= end;
};

// 시작 시각 순(같으면 id 순)으로 정렬한 새 배열 — 하루 안에서 일정이 등록한 순서가 아니라 시간 순으로 보이게 해요.
export const sortEventsByStart = (events) =>
  [...(events || [])].sort(
    (a, b) =>
      String(a.start_datetime || "").localeCompare(String(b.start_datetime || "")) ||
      Number(a.event_id ?? 0) - Number(b.event_id ?? 0),
  );
