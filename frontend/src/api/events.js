import client from "./client";
import { toEvent, toEventRequest } from "./mappers";

// 보고 있는 달(month: 1~12)의 일정. 달력 칸에는 앞뒤 달의 날짜도 보여서 앞뒤 한 달씩 함께 받아요.
// 서버의 캘린더 조회는 작업과 일정을 같이 주는데, 작업은 이미 불러둔 걸 쓰니까 일정(EVENT)만 골라요.
export const getEventsAround = async (workspaceId, year, month) => {
  const months = [-1, 0, 1].map((diff) => {
    const date = new Date(year, month - 1 + diff, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });

  const responses = await Promise.all(
    months.map((params) => client.get(`/workspaces/${workspaceId}/calendar`, { params })),
  );

  const events = new Map();
  responses.forEach(({ data }) => {
    data.filter((item) => item.type === "EVENT").forEach((item) => events.set(item.id, toEvent(item)));
  });

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
