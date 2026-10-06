import client from "./client";

// 통합 검색. 응답: { keyword, pages, tasks, sprints, comments, events }
// 각 항목: { type, id, title, snippet, icon, meta, link } — link를 그대로 navigate에 쓰면 돼요.
export const searchWorkspace = async (workspaceId, keyword, { signal } = {}) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/search`, {
    params: { q: keyword },
    signal,
  });
  return data;
};
