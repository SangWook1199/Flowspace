import client from "./client";
import { toWorkspace, toWorkspaceRequest, toMember, toMemberProfile } from "./mappers";

// 내 워크스페이스 목록
export const getWorkspaces = async () => {
  const { data } = await client.get("/workspaces");
  return data.map(toWorkspace);
};

// 워크스페이스 만들기 (form: { name, initials, color(#hex), icon })
export const createWorkspace = async (form) => {
  const { data } = await client.post("/workspaces", toWorkspaceRequest(form));
  return toWorkspace(data);
};

// 워크스페이스 수정 — 소유자만 가능해요. 이름·이니셜·색·아이콘을 한 번에 보내요(icon을 비우면 아이콘이 지워져요).
export const updateWorkspace = async (workspaceId, form) => {
  const { data } = await client.patch(`/workspaces/${workspaceId}`, toWorkspaceRequest(form));
  return toWorkspace(data);
};

// 이메일로 초대 (한 번에 한 명) — 관리자 이상만 가능해요.
export const inviteMember = (workspaceId, email) =>
  client.post(`/workspaces/${workspaceId}/invites`, { email });

// 내가 받은 초대 중 아직 수락/거절하지 않은 것들
export const getMyInvites = async () => {
  const { data } = await client.get("/workspaces/invites/me");
  return data;
};

export const acceptInvite = (inviteId) => client.patch(`/workspaces/invites/${inviteId}/accept`);

export const declineInvite = (inviteId) => client.patch(`/workspaces/invites/${inviteId}/decline`);

// 워크스페이스 멤버 목록 (currentUserId는 online 표시용)
export const getMembers = async (workspaceId, currentUserId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/members`);
  return data.map((member) => toMember(member, currentUserId));
};

// 소유권 이전 — 소유자만 가능해요. 이전하면 나는 일반 멤버가 돼요.
export const transferOwnership = (workspaceId, userId) =>
  client.patch(`/workspaces/${workspaceId}/owner`, { userId });

// 멤버 추방 — 관리자 이상만 가능해요. 관리자는 일반 멤버만, 소유자는 관리자·멤버를 내보낼 수 있고, 소유자 본인은 추방할 수 없어요.
export const removeMember = (workspaceId, userId) =>
  client.delete(`/workspaces/${workspaceId}/members/${userId}`);

// 멤버 역할 변경 — 소유자만 가능해요. role: "ADMIN" | "MEMBER" (소유자 자리는 소유권 이전으로만 바뀌어요)
export const changeMemberRole = (workspaceId, userId, role) =>
  client.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });

export const leaveWorkspace = (workspaceId) => client.delete(`/workspaces/${workspaceId}/leave`);

export const deleteWorkspace = (workspaceId) => client.delete(`/workspaces/${workspaceId}`);

// 멤버 프로필 카드: 같은 워크스페이스 멤버의 소개와 맡고 있는 작업 요약
export const getMemberProfile = async (workspaceId, userId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/members/${userId}`);
  return toMemberProfile(data);
};
