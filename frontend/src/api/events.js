import client from "./client";
import { toEvent, toEventRequest } from "./mappers";

// 한 달(month: 1~12)의 일정. 서버의 캘린더 조회는 작업과 일정을 같이 주는데,
// 작업은 이미 불러둔 걸 쓰니까 일정(EVENT)만 골라요. 일정은 "시작일이 그 달인 것"이 와요.
export const getEventsOfMonth = async (workspaceId, year, month) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/calendar`, { params: { year, month } });
  return data.filter((item) => item.type === "EVENT").map(toEvent);
};

// 보고 있는 달의 일정. 달력 칸에는 앞뒤 달의 날짜도 보여서 앞뒤 한 달씩 함께 받아요(대시보드가 써요).
export const getEventsAround = async (workspaceId, year, month) => {
  const months = [-1, 0, 1].map((diff) => {
    const date = new Date(year, month - 1 + diff, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });

  const lists = await Promise.all(months.map((m) => getEventsOfMonth(workspaceId, m.year, m.month)));

  const events = new Map();
  lists.flat().forEach((event) => events.set(event.event_id, event));

  return [...events.values()];
};

// 일정 한 건 (색까지 포함). 페이지의 일정 블록이 연결된 일정을 그릴 때 써요.
export const getEvent = async (eventId) => {
  const { data } = await client.get(`/events/${eventId}`);
  return toEvent(data);
};

// 제목으로 일정 검색(keyword가 비면 전체). 일정 블록의 선택 목록에 써요. 검색 응답엔 색·설명이 없어요.
export const searchEvents = async (workspaceId, keyword = "") => {
  const { data } = await client.get(`/workspaces/${workspaceId}/events/search`, { params: { keyword } });
  return data.map((item) => ({
    event_id: item.eventId,
    title: item.title,
    start_datetime: item.startAt ? String(item.startAt).slice(0, 16) : null,
    end_datetime: item.endAt ? String(item.endAt).slice(0, 16) : null,
  }));
};

// 일정 만들기 (form은 캘린더의 새 일정 모달 값)
export const createEvent = async (workspaceId, form) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/events`, toEventRequest(form));
  return toEvent(data);
};

// 일정 고치기 (form은 새 일정 모달과 같은 값)
export const updateEvent = async (eventId, form) => {
  const { data } = await client.patch(`/events/${eventId}`, toEventRequest(form));
  return toEvent(data);
};

// 일정 지우기
export const deleteEvent = async (eventId) => {
  await client.delete(`/events/${eventId}`);
};
