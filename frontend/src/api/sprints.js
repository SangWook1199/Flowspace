import client from "./client";
import { toSprint, toSprintCreateRequest } from "./mappers";

// 워크스페이스의 스프린트 목록. 맨 앞에 백로그(isBacklog)가 같이 와요.
export const getSprints = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/sprints`);
  return data.map(toSprint);
};

// 스프린트 만들기 (form은 SprintForm이 넘겨주는 값)
export const createSprint = async (workspaceId, form) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/sprints`, toSprintCreateRequest(form));
  return toSprint(data);
};

// 스프린트 상태 변경: PLANNING → ACTIVE → COMPLETED (완료하면 회고가 만들어지고 남은 작업은 백로그로 가요)
export const updateSprintStatus = async (sprintId, status) => {
  const { data } = await client.patch(`/sprints/${sprintId}/status`, { status });
  return toSprint(data);
};

// 스프린트 삭제 (속한 작업은 백로그로 가요)
export const deleteSprint = (sprintId) => client.delete(`/sprints/${sprintId}`);
