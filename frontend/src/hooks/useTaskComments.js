import { useState } from "react";

import * as commentApi from "../api/comments";
import { toEditorComments } from "../api/mappers";
import { getErrorMessage } from "../utils/apiError";
import { useRequest } from "./useRequest";

// 작업 한 건의 댓글: 불러오기 · 작성 · 삭제. 화면이 쓰는 평평한 댓글({id, userId, author, text, createdAt, editedAt})로 줘요.
// taskId가 바뀌면 다시 불러와요.
export function useTaskComments(taskId) {
  const {
    data,
    loading,
    error: loadError,
    reload,
    setData,
  } = useRequest(async () => toEditorComments(await commentApi.getTaskComments(taskId)), [taskId], {
    enabled: taskId != null,
    initialData: [],
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // 성공하면 true. 실패하면 false(안내 문구는 actionError에 담겨요).
  const add = async (text) => {
    const content = text.trim();
    if (!content || saving) return false;

    setSaving(true);
    setActionError("");
    try {
      const created = await commentApi.createTaskComment(taskId, content);
      setData((prev) => [...(prev ?? []), ...toEditorComments([created])]);
      return true;
    } catch (err) {
      setActionError(getErrorMessage(err, "댓글을 남기지 못했어요."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (commentId) => {
    setActionError("");
    try {
      await commentApi.deleteComment(commentId);
      // 답글이 달린 댓글을 지우면 서버가 답글도 같이 정리할 수 있어서, 목록을 다시 받아 맞춰요.
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err, "댓글을 삭제하지 못했어요."));
    }
  };

  return {
    comments: data ?? [],
    loading,
    saving,
    error: actionError || loadError || "",
    add,
    remove,
    reload,
  };
}
