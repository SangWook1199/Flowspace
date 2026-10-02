import client from "./client";

// 데이터베이스(표) 블록 API. 응답은 서버 그대로 돌려주고, 화면 모양 변환은 mappers/database.js ·
// 에디터와 서버를 맞추는 일은 databaseSync.js가 해요.

// 데이터베이스 전체(열·옵션·행·셀)
export const getDatabaseDetail = async (databaseId) => {
  const { data } = await client.get(`/databases/${databaseId}/detail`);
  return data;
};

// 데이터베이스 만들기: 서버가 페이지 안에 DATABASE 블록까지 같이 만들어요(응답의 blockId).
// seedPageId: 첫 행에 연결할 기존 페이지(없으면 서버가 새 페이지를 만들어요)
export const createDatabase = async (pageId, { title, viewType, seedPageId = null }) => {
  const { data } = await client.post(`/pages/${pageId}/databases`, { title, viewType, seedPageId });
  return data;
};

export const updateDatabaseTitle = (databaseId, title) => client.patch(`/databases/${databaseId}`, { title });

/* ---------- 열 ---------- */

export const createColumn = async (databaseId, { name, type }) => {
  const { data } = await client.post(`/databases/${databaseId}/columns`, { name, type });
  return data;
};

export const updateColumn = async (databaseId, columnId, { name, type }) => {
  const { data } = await client.patch(`/databases/${databaseId}/columns/${columnId}`, { name, type });
  return data;
};

export const updateColumnWidth = async (databaseId, columnId, width) => {
  const { data } = await client.patch(`/databases/${databaseId}/columns/${columnId}/width`, { width });
  return data;
};

// columns: 새 순서대로 [{ columnId, position }]
export const reorderColumns = (databaseId, columns) =>
  client.patch(`/databases/${databaseId}/columns/reorder`, { columns });

export const deleteColumn = (databaseId, columnId) => client.delete(`/databases/${databaseId}/columns/${columnId}`);

/* ---------- 옵션 (선택·다중 선택·상태 열의 선택지) ---------- */

export const createOption = async (databaseId, columnId, { value, color, statusGroup }) => {
  const { data } = await client.post(`/databases/${databaseId}/columns/${columnId}/options`, {
    value,
    color,
    statusGroup,
  });
  return data;
};

export const updateOption = async (databaseId, columnId, optionId, { value, color, statusGroup }) => {
  const { data } = await client.patch(`/databases/${databaseId}/columns/${columnId}/options/${optionId}`, {
    value,
    color,
    statusGroup,
  });
  return data;
};

// options: [{ optionId, position }]
export const reorderOptions = (databaseId, columnId, options) =>
  client.patch(`/databases/${databaseId}/columns/${columnId}/options/reorder`, { options });

export const deleteOption = (databaseId, columnId, optionId) =>
  client.delete(`/databases/${databaseId}/columns/${columnId}/options/${optionId}`);

/* ---------- 행 · 셀 ---------- */

// pageId: 행에 연결할 기존 페이지(없으면 서버가 새로 만들고, 표는 페이지 없이 만들어요)
export const createRow = async (databaseId, pageId = null) => {
  const { data } = await client.post(`/databases/${databaseId}/rows`, pageId == null ? {} : { pageId });
  return data;
};

// rows: [{ rowId, position }]
export const reorderRows = (databaseId, rows) => client.patch(`/databases/${databaseId}/rows/reorder`, { rows });

export const deleteRow = (databaseId, rowId) => client.delete(`/databases/${databaseId}/rows/${rowId}`);

export const updateCell = (databaseId, { rowId, columnId, value }) =>
  client.patch(`/databases/${databaseId}/cells`, { rowId, columnId, value });
