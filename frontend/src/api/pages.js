import client from "./client";
import { toPage, toPageUpdateRequest } from "./mappers";

// 워크스페이스의 페이지 목록 (삭제되지 않은 것, 표시 순서대로)
export const getPages = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/pages`);
  return data.map(toPage);
};

// 휴지통에 있는 페이지 목록
export const getTrashedPages = async (workspaceId) => {
  const { data } = await client.get(`/workspaces/${workspaceId}/pages/trash`);
  return data.map(toPage);
};

// 페이지 만들기
export const createPage = async (workspaceId, { parentPageId = null, title = "제목 없음", icon = "📄" } = {}) => {
  const { data } = await client.post(`/workspaces/${workspaceId}/pages`, { parentPageId, title, icon });
  return toPage(data);
};

// 제목·아이콘 수정 (page는 화면의 최신 페이지 객체)
export const updatePage = async (page) => {
  const { data } = await client.patch(`/pages/${page.id}`, toPageUpdateRequest(page));
  return toPage(data);
};

// 휴지통으로 이동 (하위 페이지도 함께)
export const deletePage = (pageId) => client.delete(`/pages/${pageId}`);

// 휴지통에서 복원
export const restorePage = (pageId) => client.post(`/pages/${pageId}/restore`);

// 휴지통에서 영구 삭제
export const deletePagePermanently = (pageId) => client.delete(`/pages/${pageId}/permanent`);

// 휴지통 비우기
export const emptyTrash = (workspaceId) => client.delete(`/workspaces/${workspaceId}/pages/trash`);

// 페이지 복제 (하위 페이지·블록·데이터베이스 포함)
export const duplicatePage = async (pageId, parentPageId = null) => {
  const { data } = await client.post(`/pages/${pageId}/duplicate`, parentPageId == null ? {} : { parentPageId });
  return toPage(data);
};

// 같은 상위 페이지의 페이지를 표시 순서대로 저장
export const reorderPages = (workspaceId, pageIds) =>
  client.patch(`/workspaces/${workspaceId}/pages/reorder`, { pageIds });
