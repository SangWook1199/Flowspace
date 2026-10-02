import client from "./client";

// 최근 활동 7개(서버 응답 그대로). 화면 문구로 바꾸는 건 mappers의 toActivity가 해요 —
// 대상(작업·스프린트·페이지) 이름은 화면이 이미 가진 목록에서 찾아서 붙여요.
export const getRecentActivities = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/activities/recent`);
  return data;
};
