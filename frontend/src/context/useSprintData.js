import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as sprintApi from "../api/sprints";
import * as taskApi from "../api/tasks";
import { getErrorMessage } from "../utils/apiError";
import { percentOf } from "../utils/date";
import useDialog from "./useDialog";

// 작업 정보(제목·담당자·날짜 등)를 고칠 때 서버에 보내기까지 기다리는 시간(타이핑 중 요청 폭주 방지).
const TASK_SAVE_DELAY_MS = 600;

export const BACKLOG_ID = "backlog";

const BACKLOG_BASE = {
  id: BACKLOG_ID,
  name: "백로그",
  description: "아직 스프린트에 배정되지 않은 작업",
  goal: "아직 스프린트에 배정되지 않은 작업",
  status: "BACKLOG",
  startDate: "",
  endDate: "",
  color: "slate",
  icon: "Archive",
};

// 스프린트·작업·칸반 상태를 워크스페이스 단위로 불러와서 들고 있는 훅이에요.
// WorkspaceProvider가 이 훅의 결과를 그대로 화면에 내보내요(스프린트 목록/상세, 작업 목록, 칸반, 페이지 TASK 블록이
// 모두 같은 데이터를 봐요).
//
// 구조: 스프린트 목록 + 상태(컬럼) 목록 + 모든 작업(스프린트별 + 백로그)을 한 번에 받아와요.
// 작업 수가 많지 않은 팀 단위 서비스라 이렇게 받아두면 화면마다 따로 불러올 필요가 없어요.
export function useSprintData({ userId, workspaceId }) {
  // 서버 호출이 실패했을 때 앱 토스트로 알려요.
  const { notify } = useDialog();
  const notifyError = (err, fallback) => notify(getErrorMessage(err, fallback));

  const [sprints, setSprints] = useState([]); // 서버 스프린트(백로그 제외)
  const [statuses, setStatuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  // 어느 워크스페이스까지 불러왔는지. 현재 워크스페이스와 다르면 "불러오는 중"이에요.
  const [loadedFor, setLoadedFor] = useState(null);
  const [error, setError] = useState(null);

  const requestId = useRef(0);
  const tasksRef = useRef(tasks);
  const statusesRef = useRef(statuses);
  // 작업 수정 저장 대기 타이머(taskId → timeout id). 대기 중인 작업은 서버 목록으로 덮어쓰지 않아요.
  const saveTimers = useRef(new Map());

  useEffect(() => {
    tasksRef.current = tasks;
    statusesRef.current = statuses;
  });

  // silent: 화면을 "불러오는 중"으로 바꾸지 않고 조용히 서버 상태와 맞춰요(상태 삭제·스프린트 완료 뒤 등).
  const load = useCallback(async (id, { silent = false } = {}) => {
    const reqId = ++requestId.current;
    if (!silent) setError(null);

    try {
      const [sprintList, statusList, backlogTasks] = await Promise.all([
        sprintApi.getSprints(id),
        taskApi.getStatuses(id),
        taskApi.getBacklogTasks(id),
      ]);
      const realSprints = sprintList.filter((sprint) => !sprint.isBacklog);
      const perSprint = await Promise.all(realSprints.map((sprint) => taskApi.getSprintTasks(sprint.id)));
      if (reqId !== requestId.current) return;

      const incoming = [...perSprint.flat(), ...backlogTasks];
      const dirtyIds = new Set(saveTimers.current.keys());

      setTasks((prev) => {
        if (dirtyIds.size === 0) return incoming;
        // 고치는 중(저장 대기)인 작업은 화면 값을 유지해요.
        const prevById = new Map(prev.map((task) => [task.id, task]));
        return incoming.map((task) => (dirtyIds.has(task.id) ? (prevById.get(task.id) ?? task) : task));
      });
      setSprints(realSprints);
      setStatuses([...statusList].sort((a, b) => a.position - b.position));
      setLoadedFor(id);
    } catch (err) {
      if (reqId !== requestId.current) return;
      if (!silent) {
        setError(getErrorMessage(err));
        setLoadedFor(id);
      }
    }
  }, []);

  // 로그인한 사람이나 워크스페이스가 바뀌면 이전 데이터를 바로 비우고 새로 불러와요.
  useEffect(() => {
    requestId.current++;
    saveTimers.current.forEach((timer) => clearTimeout(timer));
    saveTimers.current.clear();

    /* eslint-disable react-hooks/set-state-in-effect */
    setSprints([]);
    setStatuses([]);
    setTasks([]);
    setLoadedFor(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (userId != null && workspaceId != null) load(workspaceId);
  }, [userId, workspaceId, load]);

  // 화면이 사라질 때 대기 중인 타이머를 정리해요.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const loading = workspaceId != null && loadedFor !== workspaceId;

  const reload = useCallback(() => {
    if (workspaceId == null) return Promise.resolve();
    setLoadedFor(null);
    return load(workspaceId);
  }, [workspaceId, load]);

  const refresh = useCallback(
    () => (workspaceId == null ? Promise.resolve() : load(workspaceId, { silent: true })),
    [workspaceId, load],
  );

  // 탭이나 창으로 돌아오면(15초 넘게 지났을 때) 조용히 서버 값으로 맞춰요 — 다른 사람이 바꾼 작업·상태가 보여요.
  // 처음 불러오는 중이거나 불러오지 못한 상태에서는 하지 않아요.
  useEffect(() => {
    if (userId == null || workspaceId == null || loadedFor !== workspaceId || error) return undefined;

    let lastLoadedAt = Date.now();
    const refreshIfStale = () => {
      if (document.visibilityState === "hidden" || Date.now() - lastLoadedAt < 15000) return;
      lastLoadedAt = Date.now();
      load(workspaceId, { silent: true });
    };

    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [userId, workspaceId, loadedFor, error, load]);

  /* ---------- 화면용 계산 값 ---------- */

  // 상태 id → 카테고리(TODO/IN_PROGRESS/DONE). 스프린트 요약 숫자는 이걸로 세요.
  const categoryByStatusId = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status.id, status.category])),
    [statuses],
  );

  const sprintsWithStats = useMemo(
    () =>
      sprints.map((sprint) => {
        const own = tasks.filter((task) => task.sprintId === sprint.id);
        const count = (category) => own.filter((task) => categoryByStatusId[task.statusId] === category).length;
        const completed = count("DONE");

        return {
          ...sprint,
          total: own.length,
          completed,
          inProgress: count("IN_PROGRESS"),
          todo: own.length - completed - count("IN_PROGRESS"),
          progress: percentOf(completed, own.length),
        };
      }),
    [sprints, tasks, categoryByStatusId],
  );

  const backlog = useMemo(() => {
    const own = tasks.filter((task) => task.sprintId === null);

    return {
      ...BACKLOG_BASE,
      taskCount: own.length,
      total: own.length,
      completed: own.filter((task) => categoryByStatusId[task.statusId] === "DONE").length,
    };
  }, [tasks, categoryByStatusId]);

  /* ---------- 스프린트 ---------- */

  // 실패하면 예외를 던져요(호출한 화면이 안내 문구를 보여줘요).
  const createSprint = async (form) => {
    const sprint = await sprintApi.createSprint(workspaceId, form);
    setSprints((prev) => [sprint, ...prev]);
    return sprint;
  };

  // 스프린트 정보(이름·목표·설명·색·기간)를 고쳐요. 실패하면 예외를 던져요(수정 화면이 안내 문구를 보여줘요).
  const updateSprint = async (sprintId, form) => {
    const updated = await sprintApi.updateSprint(sprintId, form);
    setSprints((prev) => prev.map((sprint) => (sprint.id === sprintId ? updated : sprint)));
    return updated;
  };

  // 스프린트 시작(ACTIVE)·완료(COMPLETED). 완료하면 서버가 회고를 만들고 남은 작업을 백로그로 보내서 다시 맞춰요.
  const changeSprintStatus = async (sprintId, status) => {
    try {
      const updated = await sprintApi.updateSprintStatus(sprintId, status);
      setSprints((prev) => prev.map((sprint) => (sprint.id === sprintId ? updated : sprint)));
      if (status === "COMPLETED") await refresh();
      return true;
    } catch (err) {
      notifyError(err, "스프린트 상태를 바꾸지 못했어요.");
      return false;
    }
  };

  // 스프린트를 지워요. 속한 작업은 서버가 백로그로 보내서 다시 맞춰요.
  const deleteSprint = async (sprintId) => {
    try {
      await sprintApi.deleteSprint(sprintId);
      setSprints((prev) => prev.filter((sprint) => sprint.id !== sprintId));
      await refresh();
      return true;
    } catch (err) {
      notifyError(err, "스프린트를 삭제하지 못했어요.");
      return false;
    }
  };

  /* ---------- 작업 ---------- */

  // 새 작업을 만들어요. sprintId가 null이면 백로그에 만들어요. 실패하면 안내하고 null을 돌려줘요.
  const createTask = async (sprintId, draft) => {
    const withDefaults = { ...draft, statusId: draft.statusId ?? statusesRef.current[0]?.id };

    try {
      const created =
        sprintId == null || sprintId === BACKLOG_ID
          ? await taskApi.createBacklogTask(workspaceId, withDefaults)
          : await taskApi.createTask(sprintId, withDefaults);
      setTasks((prev) => [...prev, created]);
      return created;
    } catch (err) {
      notifyError(err, "작업을 만들지 못했어요.");
      return null;
    }
  };

  const scheduleTaskSave = (taskId) => {
    clearTimeout(saveTimers.current.get(taskId));
    saveTimers.current.set(
      taskId,
      setTimeout(async () => {
        saveTimers.current.delete(taskId);

        const task = tasksRef.current.find((item) => item.id === taskId);
        if (!task) return;

        try {
          const saved = await taskApi.updateTask(task);
          // 그 사이 또 고쳤다면(새 저장 대기 중) 서버가 정한 값(순서·완료 시각)만 반영해요.
          setTasks((prev) =>
            prev.map((item) =>
              item.id === taskId
                ? { ...item, position: saved.position, completedAt: saved.completedAt, statusName: saved.statusName }
                : item,
            ),
          );
        } catch (err) {
          notifyError(err, "작업을 저장하지 못했어요.");
          refresh();
        }
      }, TASK_SAVE_DELAY_MS),
    );
  };

  // 작업 값을 고쳐요. 화면에는 바로 반영하고, 서버에는 잠깐 기다렸다가 한 번만 보내요.
  // patch는 화면 작업 모양의 일부({title, assignees, priority, startDate, dueDate, description, statusId, sprintId …})예요.
  const updateTask = (taskId, patch) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const next = { ...task, ...patch };
        // 하위 작업 담당자는 작업 담당자 중에서만 고를 수 있어서, 작업 담당자에서 빠진 사람은 하위 작업에서도 비워요
        // (서버도 같은 처리를 해요).
        if (patch.assignees) {
          const ids = new Set(patch.assignees.map((user) => user.id));
          next.subtasks = (task.subtasks ?? []).map((item) =>
            item.assigneeId != null && !ids.has(item.assigneeId) ? { ...item, assigneeId: null } : item,
          );
        }
        return next;
      }),
    );
    scheduleTaskSave(taskId);
  };

  // 선택한 작업들을 한 번에 지워요(화면에서 먼저 없애고 서버에 알려요).
  const deleteTasks = async (taskIds) => {
    const idSet = new Set(taskIds);
    idSet.forEach((id) => {
      clearTimeout(saveTimers.current.get(id));
      saveTimers.current.delete(id);
    });
    setTasks((prev) => prev.filter((task) => !idSet.has(task.id)));

    const results = await Promise.allSettled(taskIds.map((id) => taskApi.deleteTask(id)));
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      notifyError(failed.reason, "일부 작업을 삭제하지 못했어요.");
      await refresh();
    }
  };

  // 칸반 드롭: 작업을 어느 컬럼의 어느 카드 앞(beforeTaskId, null이면 맨 끝)으로 옮겨요.
  // 화면 배열은 바로 바꾸고, 서버에는 (컬럼이 바뀌면) 상태 변경 + 영향받은 컬럼의 순서를 보내요.
  const moveTaskOnBoard = async ({ taskId, statusId, beforeTaskId }) => {
    const current = tasksRef.current;
    const fromIndex = current.findIndex((task) => task.id === taskId);
    if (fromIndex === -1) return;

    const original = current[fromIndex];
    const next = [...current];
    next.splice(fromIndex, 1);
    const moved = { ...original, statusId };
    const toIndex = beforeTaskId == null ? -1 : next.findIndex((task) => task.id === beforeTaskId);

    if (toIndex === -1) next.push(moved);
    else next.splice(toIndex, 0, moved);

    // 컬럼마다 0부터 번호를 다시 매겨 서버에 보낼 목록을 만들어요(같은 스프린트의 영향받은 두 컬럼만).
    const affected = new Set([original.statusId, statusId]);
    const items = [];
    const counters = new Map();

    const reordered = next.map((task) => {
      if (task.sprintId !== moved.sprintId || !affected.has(task.statusId)) return task;
      const position = counters.get(task.statusId) ?? 0;
      counters.set(task.statusId, position + 1);
      items.push({ taskId: task.id, position, statusId: task.statusId });
      return { ...task, position };
    });

    setTasks(reordered);

    try {
      if (original.statusId !== statusId) await taskApi.updateTaskStatus(taskId, statusId);
      if (items.length > 0) await taskApi.reorderTasks(items);
    } catch (err) {
      notifyError(err, "작업을 옮기지 못했어요.");
      await refresh();
    }
  };

  /* ---------- 하위 작업 ---------- */

  const patchSubtasks = (taskId, fn) =>
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, subtasks: fn(task.subtasks ?? []) } : task)));

  // 하위 작업 체크를 토글해요(index는 그 작업의 하위 작업 배열에서의 순서).
  const toggleSubtask = async (taskId, subtaskIndex) => {
    const subtask = tasksRef.current.find((task) => task.id === taskId)?.subtasks?.[subtaskIndex];
    if (!subtask) return;

    const checked = !subtask.checked;
    patchSubtasks(taskId, (list) => list.map((item) => (item.id === subtask.id ? { ...item, checked } : item)));

    try {
      await taskApi.updateSubtask(subtask.id, { content: subtask.text, isCompleted: checked, assigneeId: subtask.assigneeId });
    } catch (err) {
      notifyError(err, "하위 작업을 저장하지 못했어요.");
      await refresh();
    }
  };

  // 하위 작업 이름을 바꿔요(체크 여부는 그대로 보내요).
  const renameSubtask = async (taskId, subtaskId, text) => {
    const subtask = tasksRef.current.find((task) => task.id === taskId)?.subtasks?.find((item) => item.id === subtaskId);
    const content = text.trim();
    if (!subtask || !content || content === subtask.text) return;

    patchSubtasks(taskId, (list) => list.map((item) => (item.id === subtaskId ? { ...item, text: content } : item)));

    try {
      await taskApi.updateSubtask(subtaskId, { content, isCompleted: subtask.checked, assigneeId: subtask.assigneeId });
    } catch (err) {
      notifyError(err, "하위 작업 이름을 저장하지 못했어요.");
      await refresh();
    }
  };

  // 하위 작업 담당자를 바꿔요(assigneeId가 null이면 담당자 없음). 작업 담당자 중에서만 고를 수 있어요.
  const setSubtaskAssignee = async (taskId, subtaskId, assigneeId) => {
    const subtask = tasksRef.current.find((task) => task.id === taskId)?.subtasks?.find((item) => item.id === subtaskId);
    if (!subtask || subtask.assigneeId === assigneeId) return;

    patchSubtasks(taskId, (list) => list.map((item) => (item.id === subtaskId ? { ...item, assigneeId } : item)));

    try {
      await taskApi.updateSubtask(subtaskId, { content: subtask.text, isCompleted: subtask.checked, assigneeId });
    } catch (err) {
      notifyError(err, "하위 작업 담당자를 저장하지 못했어요.");
      await refresh();
    }
  };

  // 하위 작업 순서를 바꿔요(fromIndex 자리의 것을 toIndex 자리로). 순서는 0부터 차례로 다시 매겨서 저장해요.
  const moveSubtask = async (taskId, fromIndex, toIndex) => {
    const list = tasksRef.current.find((task) => task.id === taskId)?.subtasks ?? [];
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const ordered = next.map((item, index) => ({ ...item, position: index }));
    patchSubtasks(taskId, () => ordered);

    try {
      await taskApi.reorderSubtasks(ordered.map((item) => ({ subtaskId: item.id, position: item.position })));
    } catch (err) {
      notifyError(err, "하위 작업 순서를 저장하지 못했어요.");
      await refresh();
    }
  };

  // 하위 작업을 추가해요(texts는 문자열 배열, 순서대로 하나씩 만들어요).
  // 모두 추가하면 true, 하나라도 실패하면 안내하고 false를 돌려줘요.
  const addSubtasks = async (taskId, texts) => {
    for (const text of texts) {
      try {
        const created = await taskApi.createSubtask(taskId, text);
        patchSubtasks(taskId, (list) => [...list, created]);
      } catch (err) {
        notifyError(err, "하위 작업을 추가하지 못했어요.");
        return false;
      }
    }
    return true;
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    patchSubtasks(taskId, (list) => list.filter((item) => item.id !== subtaskId));

    try {
      await taskApi.deleteSubtask(subtaskId);
    } catch (err) {
      notifyError(err, "하위 작업을 삭제하지 못했어요.");
      await refresh();
    }
  };

  /* ---------- 칸반 상태(컬럼) ---------- */

  const createStatus = async (data) => {
    try {
      const created = await taskApi.createStatus(workspaceId, data);
      setStatuses((prev) => [...prev, created]);
      return true;
    } catch (err) {
      notifyError(err, "상태를 만들지 못했어요.");
      return false;
    }
  };

  const saveStatus = async (data) => {
    try {
      const updated = await taskApi.updateStatus(workspaceId, data.id, data);
      setStatuses((prev) => prev.map((status) => (status.id === data.id ? { ...status, ...updated, position: status.position } : status)));
      // 기본 상태를 고치면 서버가 이 워크스페이스 전용 새 상태(새 id)로 바꿔 끼우고 작업도 그쪽으로 옮겨요.
      // 화면의 작업도 새 id로 맞춰야 컬럼 밖으로 밀려나지 않아요.
      if (updated?.id != null && updated.id !== data.id) {
        setTasks((prev) => prev.map((task) => (task.statusId === data.id ? { ...task, statusId: updated.id } : task)));
      }
      return true;
    } catch (err) {
      notifyError(err, "상태를 저장하지 못했어요.");
      return false;
    }
  };

  // 컬럼을 지우면 그 컬럼의 작업은 moveToStatusId 컬럼으로 옮겨져요.
  const deleteStatus = async ({ deleteStatusId, moveToStatusId }) => {
    const canMove =
      moveToStatusId !== deleteStatusId && statusesRef.current.some((status) => status.id === moveToStatusId);
    if (!canMove) return;

    try {
      await taskApi.deleteStatus(workspaceId, deleteStatusId, moveToStatusId);
      await refresh();
    } catch (err) {
      notifyError(err, "상태를 삭제하지 못했어요.");
    }
  };

  // 컬럼 순서를 저장해요(orderedStatuses는 왼쪽부터의 컬럼 배열).
  const reorderStatuses = async (orderedStatuses) => {
    setStatuses(orderedStatuses.map((status, index) => ({ ...status, position: index })));

    try {
      await taskApi.reorderStatuses(
        workspaceId,
        orderedStatuses.map((status) => status.id),
      );
    } catch (err) {
      notifyError(err, "컬럼 순서를 저장하지 못했어요.");
      await refresh();
    }
  };

  return {
    sprints: sprintsWithStats,
    backlog,
    statuses,
    tasks,
    loading,
    error,
    reload,
    createSprint,
    updateSprint,
    changeSprintStatus,
    deleteSprint,
    createTask,
    updateTask,
    deleteTasks,
    moveTaskOnBoard,
    toggleSubtask,
    addSubtasks,
    deleteSubtask,
    renameSubtask,
    setSubtaskAssignee,
    moveSubtask,
    createStatus,
    saveStatus,
    deleteStatus,
    reorderStatuses,
  };
}
