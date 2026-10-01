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

// 일정 만들기 (form은 캘린더의 새 일정 모달 값)
export const createEvent = async (workspaceId, form) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/events`, toEventRequest(form));
  return toEvent(data);
};
