import client from "./client";

// 블록 댓글 API. 서버 댓글은 { commentId, userId, userName, content, createdAt, updatedAt, replies }예요.

export const createBlockComment = async (blockId, content) => {
  const { data } = await client.post(`/blocks/${blockId}/comments`, { content });
  return data;
};

export const updateComment = async (commentId, content) => {
  const { data } = await client.patch(`/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = (commentId) => client.delete(`/comments/${commentId}`);
