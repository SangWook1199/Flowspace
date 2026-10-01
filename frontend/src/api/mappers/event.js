// 서버 일정 → 캘린더 화면의 일정 모양(snake_case는 캘린더 컴포넌트가 원래 쓰던 이름이에요).
// 캘린더 조회(CalendarItemResponse: id)와 일정 생성/수정(EventResponse: eventId) 응답을 둘 다 받아요.
// 날짜·시각은 "2026-06-17T14:00:00"을 화면의 datetime-local 값("2026-06-17T14:00")으로 맞춰요.
const toMinute = (value) => (value ? String(value).slice(0, 16) : null);

export const toEvent = (dto) => ({
  event_id: dto.eventId ?? dto.id,
  workspace_id: dto.workspaceId ?? null,
  created_by: dto.createdByName ?? null,
  title: dto.title,
  description: dto.description ?? "",
  color: dto.color,
  start_datetime: toMinute(dto.startDatetime),
  end_datetime: toMinute(dto.endDatetime),
});

// 일정 만들기 화면의 값 → 서버 요청
export const toEventRequest = (form) => ({
  title: form.title.trim(),
  description: form.description?.trim() ? form.description : null,
  color: form.color,
  startDatetime: form.start_datetime,
  endDatetime: form.end_datetime || null,
});
