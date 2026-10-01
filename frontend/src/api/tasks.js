import client from "./client";
import { toStatus, toSubtask, toTask, toTaskCreateRequest, toTaskUpdateRequest } from "./mappers";

/* ---------- 작업 ---------- */

// 스프린트에 속한 작업 목록 (표시 순서대로)
export const getSprintTasks = async (sprintId) => {
  const { data } = await client.get(`/sprints/${sprintId}/tasks`);
  return data.map(toTask);
};

// 스프린트에 배정되지 않은(백로그) 작업 목록
export const getBacklogTasks = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/backlog/tasks`);
  return data.map(toTask);
};

export const createTask = async (sprintId, draft) => {
  const { data } = await client.post(`/sprints/${sprintId}/tasks`, toTaskCreateRequest(draft));
  return toTask(data);
};

export const createBacklogTask = async (workspaceId, draft) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/backlog/tasks`, toTaskCreateRequest(draft));
  return toTask(data);
};

// 작업 수정 (task는 화면의 최신 작업 객체 — 모든 값을 같이 보내요)
export const updateTask = async (task) => {
  const { data } = await client.patch(`/tasks/${task.id}`, toTaskUpdateRequest(task));
  return toTask(data);
};

export const deleteTask = (taskId) => client.delete(`/tasks/${taskId}`);

// 칸반에서 다른 컬럼으로 옮길 때
export const updateTaskStatus = async (taskId, statusId) => {
  const { data } = await client.patch(`/tasks/${taskId}/status`, { statusId });
  return toTask(data);
};

// 카드 순서 저장 — items: [{ taskId, position, statusId }]
export const reorderTasks = (items) => client.patch("/tasks/reorder", { tasks: items });

/* ---------- 하위 작업 ---------- */

export const createSubtask = async (taskId, content) => {
  const { data } = await client.post(`/tasks/${taskId}/subtasks`, { content });
  return toSubtask(data);
};

export const updateSubtask = async (subtaskId, { content, isCompleted }) => {
  const { data } = await client.patch(`/subtasks/${subtaskId}`, { content, isCompleted });
  return toSubtask(data);
};

export const deleteSubtask = (subtaskId) => client.delete(`/subtasks/${subtaskId}`);

/* ---------- 칸반 상태(컬럼) ---------- */

export const getStatuses = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/task-statuses`);
  return data.map(toStatus);
};

export const createStatus = async (workspaceId, { name, category, color }) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/task-statuses`, { name, category, color });
  return toStatus(data);
};

export const updateStatus = async (workspaceId, statusId, { name, category, color }) => {
  const { data } = await client.patch(`/task-statuses/${statusId}`, { workspaceId, name, category, color });
  return toStatus(data);
};

// 컬럼을 지울 때 그 컬럼의 작업은 targetStatusId 컬럼으로 옮겨져요.
export const deleteStatus = (workspaceId, statusId, targetStatusId) =>
  client.delete(`/task-statuses/${statusId}`, { data: { workspaceId, targetStatusId } });

// 컬럼 순서 저장 — orderedIds: 왼쪽부터의 statusId 목록
export const reorderStatuses = (workspaceId, orderedIds) =>
  client.patch("/task-statuses/reorder", {
    workspaceId,
    statuses: orderedIds.map((statusId, position) => ({ statusId, position })),
  });
