import { useState } from "react";

import * as attachmentApi from "../api/taskAttachments";
import { fileUrl } from "../utils/fileUrl";
import { getErrorMessage } from "../utils/apiError";
import { useRequest } from "./useRequest";

// 서버 응답 → 화면에서 쓰는 관련 문서 한 건.
const toAttachment = (dto) => ({
  id: dto.attachmentId,
  type: dto.type === "PAGE" ? "PAGE" : "FILE",
  pageId: dto.pageId ?? null,
  pageTitle: dto.pageTitle ?? "",
  pageIcon: dto.pageIcon ?? "📄",
  fileName: dto.fileName ?? "",
  fileUrl: fileUrl(dto.fileUrl),
  fileSize: dto.fileSize ?? 0,
  mimeType: dto.mimeType ?? "",
  createdByName: dto.createdByName ?? "",
  createdAt: dto.createdAt ?? null,
});

// 작업 한 건의 관련 문서(페이지 연결 · 파일): 불러오기 · 페이지 연결 · 파일 올리기 · 삭제.
export function useTaskAttachments(taskId) {
  const {
    data,
    loading,
    error: loadError,
    setData,
  } = useRequest(async () => (await attachmentApi.getTaskAttachments(taskId)).map(toAttachment), [taskId], {
    enabled: taskId != null,
    initialData: [],
  });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const addPage = async (pageId) => {
    setActionError("");
    setBusy(true);
    try {
      const created = await attachmentApi.attachTaskPage(taskId, pageId);
      setData((prev) => [...(prev ?? []), toAttachment(created)]);
      return true;
    } catch (err) {
      setActionError(getErrorMessage(err, "페이지를 연결하지 못했어요."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // 여러 파일을 차례로 올려요. 하나가 실패해도 나머지는 계속하고, 마지막 실패 사유를 보여줘요.
  const addFiles = async (files) => {
    setActionError("");
    setBusy(true);
    try {
      for (const file of files) {
        try {
          const created = await attachmentApi.uploadTaskFile(taskId, file);
          setData((prev) => [...(prev ?? []), toAttachment(created)]);
        } catch (err) {
          setActionError(`${file.name}: ${getErrorMessage(err, "파일을 올리지 못했어요.")}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (attachmentId) => {
    setActionError("");
    try {
      await attachmentApi.deleteTaskAttachment(taskId, attachmentId);
      setData((prev) => (prev ?? []).filter((item) => item.id !== attachmentId));
    } catch (err) {
      setActionError(getErrorMessage(err, "관련 문서를 삭제하지 못했어요."));
    }
  };

  return {
    attachments: data ?? [],
    loading,
    busy,
    error: actionError || loadError || "",
    setError: setActionError,
    addPage,
    addFiles,
    remove,
  };
}
