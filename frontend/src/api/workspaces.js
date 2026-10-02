import client from "./client";
import { toWorkspace, toWorkspaceRequest, toMember } from "./mappers";

// 내 워크스페이스 목록
export const getWorkspaces = async () => {
  const { data } = await client.get("/workspaces");
  return data.map(toWorkspace);
};

// 워크스페이스 만들기 (form: { name, initials, color(#hex) })
export const createWorkspace = async (form) => {
  const { data } = await client.post("/workspaces", toWorkspaceRequest(form));
  return toWorkspace(data);
};

// 이메일로 초대 (한 번에 한 명)
export const inviteMember = (workspaceId, email) =>
  client.post(`/workspaces/${workspaceId}/invites`, { email });

// 워크스페이스 멤버 목록 (currentUserId는 online 표시용)
export const getMembers = async (workspaceId, currentUserId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/members`);
  return data.map((member) => toMember(member, currentUserId));
};

export const leaveWorkspace = (workspaceId) => client.delete(`/workspaces/${workspaceId}/leave`);

export const deleteWorkspace = (workspaceId) => client.delete(`/workspaces/${workspaceId}`);
