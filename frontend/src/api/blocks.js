import client from "./client";

// 페이지 상세 (제목·아이콘·커버·블록 목록). 응답은 서버 그대로 돌려주고 화면 모양 변환은 mappers/block.js가 해요.
export const getPageDetail = async (pageId) => {
  const { data } = await client.get(`/pages/${pageId}/detail`);
  return data;
};

// 블록 일괄 동기화: 목록 순서가 곧 블록 순서이고, 목록에 없는 기존 블록은 서버에서 지워져요.
// baseVersion은 내가 마지막으로 받아온 페이지 버전이에요 — 그 사이 다른 멤버가 저장했으면 서버가 409로 거절해요.
// 응답은 { results: [{ clientId, block }], version } — 새로 만들어진 블록의 서버 id와 저장 뒤 페이지 버전을 받아가요.
export const syncBlocks = async (pageId, blocks, baseVersion = null) => {
  const { data } = await client.put(`/pages/${pageId}/blocks`, { blocks, baseVersion });
  return { results: data.blocks, version: data.version ?? null };
};

// 다른 멤버가 먼저 저장해서 서버가 저장을 거절한 경우(최신 내용을 합친 뒤 다시 보내면 돼요)
export const isVersionConflict = (err) =>
  err?.response?.status === 409 && err?.response?.data?.code === "PAGE_VERSION_CONFLICT";

// 블록 이미지·파일 업로드 (한 블록에 파일 하나, 다시 올리면 교체돼요)
export const uploadBlockImage = async (blockId, file) => {
  const form = new FormData();
  form.append("file", file);

  const { data } = await client.post(`/blocks/${blockId}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteBlockImage = async (blockId) => {
  const { data } = await client.delete(`/blocks/${blockId}/image`);
  return data;
};
