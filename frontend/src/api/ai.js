import client from "./client";

// AI 기능을 지금 쓸 수 있는지: { enabled(서버 설정), available(모델 연결), model }
export const getAiStatus = async () => {
  const { data } = await client.get("/ai/status");
  return data;
};

// AI 초안 만들기 시작. 바로 jobId가 담긴 작업 정보를 돌려줘요(만드는 데는 30초~2분 걸려요).
export const startAiDraft = async (workspaceId, payload) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/ai/project-drafts`, payload);
  return data;
};

// 작업 상태 조회: { jobId, status(QUEUED/RUNNING/DONE/FAILED/CANCELLED), attempt, maxAttempts, message, draft, error, elapsedSeconds }
export const getAiDraft = async (workspaceId, jobId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/ai/project-drafts/${jobId}`);
  return data;
};

// 만드는 중인 초안 취소
export const cancelAiDraft = (workspaceId, jobId) =>
  client.delete(`/workspaces/${workspaceId}/ai/project-drafts/${jobId}`);

// 확인·수정한 초안으로 스프린트·작업·일정을 한 번에 만들기 → { sprintCount, taskCount, eventCount, sprintIds }
export const applyAiDraft = async (workspaceId, jobId, draft) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/ai/project-drafts/${jobId}/apply`, draft);
  return data;
};
