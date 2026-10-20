import client from "./client";

// 작업 관련 문서 API. 서버 응답은 { attachmentId, type("PAGE"|"FILE"), pageId, pageTitle, pageIcon,
// fileId, fileName, fileUrl, fileSize, mimeType, createdByName, createdAt }예요.

export const getTaskAttachments = async (taskId) => {
  const { data } = await client.get(`/tasks/${taskId}/attachments`);
  return data;
};

export const attachTaskPage = async (taskId, pageId) => {
  const { data } = await client.post(`/tasks/${taskId}/attachments/pages`, { pageId });
  return data;
};

export const uploadTaskFile = async (taskId, file) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post(`/tasks/${taskId}/attachments/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteTaskAttachment = (taskId, attachmentId) => client.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
