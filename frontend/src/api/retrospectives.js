import client from "./client";
import { toRetroDetail, toRetroList } from "./mappers";

// 워크스페이스의 회고 목록. 스프린트마다 한 줄이고, 회고가 아직 없는 스프린트(계획됨·진행 중)도 같이 와요.
export const getRetrospectives = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/retrospectives`);
  return toRetroList(data);
};

// 스프린트의 회고 상세 (요약 · 완료 시점 칸반 스냅샷 · 회고 노트 페이지 id)
export const getSprintRetrospective = async (sprintId) => {
  const { data } = await client.get(`/sprints/${sprintId}/retrospective`);
  return toRetroDetail(data);
};
