import client from "./client";

// 댓글 API (블록 댓글 · 작업 댓글). 서버 댓글은 { commentId, userId, userName, content, createdAt, updatedAt, replies }예요.

// 작업 댓글 목록(최상위 댓글 + 각 댓글의 답글)
export const getTaskComments = async (taskId) => {
  const { data } = await client.get(`/tasks/${taskId}/comments`);
  return data;
};

export const createTaskComment = async (taskId, content) => {
  const { data } = await client.post(`/tasks/${taskId}/comments`, { content });
  return data;
};

export const createBlockComment = async (blockId, content) => {
  const { data } = await client.post(`/blocks/${blockId}/comments`, { content });
  return data;
};

export const updateComment = async (commentId, content) => {
  const { data } = await client.patch(`/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = (commentId) => client.delete(`/comments/${commentId}`);
