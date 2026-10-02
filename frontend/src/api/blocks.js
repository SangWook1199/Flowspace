import client from "./client";

// 페이지 상세 (제목·아이콘·커버·블록 목록). 응답은 서버 그대로 돌려주고 화면 모양 변환은 mappers/block.js가 해요.
export const getPageDetail = async (pageId) => {
  const { data } = await client.get(`/pages/${pageId}/detail`);
  return data;
};

// 블록 일괄 동기화: 목록 순서가 곧 블록 순서이고, 목록에 없는 기존 블록은 서버에서 지워져요.
// 응답은 [{ clientId, block }] — 새로 만들어진 블록의 서버 id를 받아가요.
export const syncBlocks = async (pageId, blocks) => {
  const { data } = await client.put(`/pages/${pageId}/blocks`, { blocks });
  return data.blocks;
};

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
