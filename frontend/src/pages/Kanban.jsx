import { useEffect, useMemo, useState, Fragment } from "react";
import { CircleCheck, Plus } from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";

import KanbanColumn from "../components/kanban/KanbanColumn";
import KanbanFilterBar from "../components/kanban/KanbanFilterBar";
import StatusModal from "../components/kanban/StatusModal";
import TaskEditModal from "../components/kanban/TaskEditModal";

import { useAuth } from "../context/useAuth";
import useDialog from "../context/useDialog";
import { loadFilters, matchesFilters, saveFilters } from "../components/kanban/kanbanUtils";
import { formatDateDots, todayKey } from "../utils/date";
import { sprintPercent, sprintRemainingLabel } from "../utils/sprint";
import { getSprintPhase } from "../utils/sprintRange";

const COLLAPSED_KEY = "flowspace.kanban.collapsedColumns";
// 완료 컬럼에 카드가 이 개수를 넘으면 완료 시각이 오래된 카드부터 접어서 보여줘요.
const DONE_VISIBLE_LIMIT = 10;

// 칸반 보드는 "진행 중인 스프린트" 하나의 작업을 보여줘요. 진행 중인 스프린트가 여러 개면 오늘이 기간에
// 들어 있는 것을 먼저, 없으면 목록에서 가장 앞의 것을 써요.
const pickActiveSprint = (sprints) => {
  const active = sprints.filter((sprint) => sprint.status === "ACTIVE");
  const today = todayKey();
  return active.find((sprint) => getSprintPhase(sprint, today).phase === "during") ?? active[0] ?? null;
};

export default function Kanban() {
  const navigate = useNavigate();
  const { sprints = [], sprintDataLoading, sprintDataError, reloadSprintData } = useOutletContext();

  if (sprintDataLoading || sprintDataError) {
    return (
      <div className="kanbanPage">
        {sprintDataLoading ? (
          <p className="emptySprints" role="status">칸반 보드를 불러오는 중이에요…</p>
        ) : (
          <div className="emptySprints" role="alert">
            <p>{sprintDataError}</p>
            <button type="button" className="sprintDetail" onClick={reloadSprintData}>
              다시 시도
            </button>
          </div>
        )}
      </div>
    );
  }

  const activeSprint = pickActiveSprint(sprints);

  if (!activeSprint) {
    return (
      <div className="kanbanPage">
        <header className="kanbanHeader">
          <div>
            <h1>칸반 보드</h1>
            <p>진행 중인 스프린트가 없어요</p>
          </div>
        </header>
        <div className="emptySprints">
          <p>스프린트를 시작하면 이곳에서 작업을 칸반으로 관리할 수 있어요.</p>
          <button type="button" className="sprintDetail" onClick={() => navigate("/sprints")}>
            스프린트 목록으로 ›
          </button>
        </div>
      </div>
    );
  }

  return <KanbanBoard key={activeSprint.id} activeSprint={activeSprint} />;
}

// 보드 머리의 스프린트 요약이에요 — 기간, 남은 일수, 진행률, 스프린트 상세로 가는 링크.
function SprintSummary({ sprint }) {
  const percent = sprintPercent(sprint);
  const remaining = sprintRemainingLabel(sprint);
  const hasPeriod = Boolean(sprint.startDate && sprint.endDate);

  return (
    <div className="kanbanSummary">
      {hasPeriod && (
        <span>
          {formatDateDots(sprint.startDate)} ~ {formatDateDots(sprint.endDate)}
        </span>
      )}
      {remaining && <span>{remaining}</span>}
      <span className="kanbanSummary__progress" title={`완료 ${sprint.completed ?? 0} / 전체 ${sprint.total ?? 0}`}>
        <i>
          <b style={{ width: `${percent}%` }} />
        </i>
        {percent}%
      </span>
      <Link to={`/sprints/${sprint.id}`}>스프린트 상세 ›</Link>
    </div>
  );
}

function KanbanBoard({ activeSprint }) {
  // 작업·상태(컬럼)는 스프린트 작업 목록·페이지 TASK 블록과 같은 공용 데이터라 어느 화면에서 바꿔도 같이 바뀌어요.
  // 드래그 중인 위치 표시는 이 화면만의 상태이고, 드롭할 때 한 번만 서버에 저장해요.
  const {
    sprintTasks,
    members = [],
    taskStatuses: statuses,
    createTask,
    updateTask,
    deleteTasks,
    toggleSubtask,
    addSubtasks,
    deleteSubtask,
    renameSubtask,
    setSubtaskAssignee,
    moveSubtask,
    moveTaskOnBoard,
    changeSprintStatus,
    createStatus: createStatusOnServer,
    saveStatus: saveStatusOnServer,
    deleteStatus: deleteStatusOnServer,
    reorderStatuses,
  } = useOutletContext();
  const auth = useAuth();
  const { confirm, notify } = useDialog();
  const [createOpen, setCreateOpen] = useState(false);
  // 필터는 스프린트별로 이 탭에 기억해요(작업을 열었다 돌아오거나 새로고침해도 그대로예요).
  const [filters, setFilters] = useState(() => loadFilters(activeSprint.id));
  useEffect(() => saveFilters(activeSprint.id, filters), [activeSprint.id, filters]);

  // 접은 컬럼은 이 브라우저에 기억해요(상태 id 목록). 보는 사람마다 다른 화면 설정이라 서버에는 저장하지 않아요.
  const [collapsedIds, setCollapsedIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const toggleCollapsed = (statusId) =>
    setCollapsedIds((prev) => {
      const next = prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // 저장소를 못 쓰면 이번 화면에서만 접혀 있어요.
      }
      return next;
    });
  // 오래된 완료 작업을 펼쳐 둔 완료 컬럼들(화면에서만 기억해요).
  const [foldOpenIds, setFoldOpenIds] = useState([]);

  // 컬럼 아래의 "작업 추가": 그 컬럼에 새 작업을 만들어요(담당자는 비워 두고, 기간은 스프린트 기간).
  // 성공하면 true를 돌려줘요 — 실패하면 컬럼이 입력을 그대로 둬요(안내는 createTask가 띄워요).
  const addTask = async (statusId, title) => {
    const created = await createTask(activeSprint.id, {
      title,
      statusId,
      assignees: [],
      priority: "MEDIUM",
      startDate: activeSprint.startDate ?? "",
      dueDate: activeSprint.endDate ?? "",
      description: "",
    });
    if (!created) return false;

    // 걸려 있는 필터 때문에 방금 만든 카드가 안 보일 수 있어서 알려줘요.
    if (!matchesFilters(created, effectiveFilters, { meId: auth?.user?.id })) {
      notify("새 작업을 만들었어요. 지금 필터에 맞지 않아 보이지 않아요.", { type: "success" });
    }
    return true;
  };

  // 컬럼(상태) 순서도 카드처럼, 드래그 중엔 "여기 놓으면 이 컬럼 앞/뒤"라는 목표 위치만 들고 있다가
  // 드롭할 때 한 번만 순서를 바꿔요(commitColumnDrop). 드래그 중인 컬럼은 반투명하게, 목표 위치는 세로줄로 보여줘요.
  const [dragStatusId, setDragStatusId] = useState(null);
  const [statusDropTarget, setStatusDropTarget] = useState(null); // { beforeStatusId }

  // 커서가 헤더 너비의 2/3 지점을 넘었는지로 "이 컬럼 앞"/"이 컬럼 뒤(=다음 컬럼 앞, 마지막이면 맨 끝)"를 정해요.
  const handleColumnDragOver = (hoveredStatusId, isAfter) => {
    if (dragStatusId === null || dragStatusId === hoveredStatusId) return;

    const hoveredIndex = statuses.findIndex((s) => s.id === hoveredStatusId);
    const nextStatus = isAfter ? statuses[hoveredIndex + 1] : null;
    const beforeStatusId = isAfter ? (nextStatus ? nextStatus.id : null) : hoveredStatusId;

    // 바로 앞 컬럼의 2/3를 넘으면 "다음 컬럼"이 자기 자신이 돼요 — 자리가 안 바뀌는 목표라 먼저 걸러요.
    if (beforeStatusId === dragStatusId) {
      setStatusDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 실제로 순서가 안 바뀌는 자리(지금 있는 자리 그대로)면 줄을 숨겨요.
    const fromIndex = statuses.findIndex((s) => s.id === dragStatusId);
    if (beforeStatusId === null) {
      if (fromIndex === statuses.length - 1) {
        setStatusDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    } else {
      const targetIndex = statuses.findIndex((s) => s.id === beforeStatusId);
      if (targetIndex === fromIndex + 1) {
        setStatusDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setStatusDropTarget((prev) =>
      prev && prev.beforeStatusId === beforeStatusId ? prev : { beforeStatusId },
    );
  };

  // 마지막 컬럼 오른쪽의 빈 공간(boardEndZone)에 들어오면 "맨 끝으로"예요.
  const handleBoardEndDragEnter = () => {
    if (dragStatusId === null) return;

    const fromIndex = statuses.findIndex((s) => s.id === dragStatusId);
    if (fromIndex === statuses.length - 1) {
      setStatusDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    setStatusDropTarget((prev) =>
      prev && prev.beforeStatusId === null ? prev : { beforeStatusId: null },
    );
  };

  // cancelled가 true면(Esc 취소, 보드 밖 드롭) 순서는 건드리지 않고 드래그 상태만 정리해요.
  const commitColumnDrop = (cancelled = false) => {
    if (!cancelled && dragStatusId !== null && statusDropTarget) {
      const next = [...statuses];
      const fromIndex = next.findIndex((s) => s.id === dragStatusId);

      if (fromIndex !== -1) {
        const [moved] = next.splice(fromIndex, 1);

        if (statusDropTarget.beforeStatusId === null) {
          next.push(moved);
        } else {
          const toIndex = next.findIndex((s) => s.id === statusDropTarget.beforeStatusId);
          if (toIndex === -1) {
            next.push(moved);
          } else {
            next.splice(toIndex, 0, moved);
          }
        }

        reorderStatuses(next);
      }
    }

    setDragStatusId(null);
    setStatusDropTarget(null);
  };

  // 카드 순서는 드래그 중엔 배열을 건드리지 않고 목표 위치(dropTarget)만 들고 있다가 드롭할 때 한 번만 바꿔요 —
  // 드래그 중에 카드를 다른 컬럼으로 옮겨 다시 그리면 드래그하던 요소가 사라져 dragend가 안 오기 때문이에요.
  //
  // 보드에는 이 스프린트의 작업만 보여줘요. 어떤 컬럼에도 안 맞는 statusId(지워진 상태 등)를 가진 작업은
  // 보드에서 사라지지 않게 첫 번째 컬럼에 모아서 보여줘요.
  const tasks = useMemo(() => {
    const statusIds = new Set(statuses.map((s) => s.id));
    const fallbackStatusId = statuses[0]?.id;

    return sprintTasks
      .filter((task) => task.sprintId === activeSprint.id)
      .map((task) =>
        statusIds.has(task.statusId) || fallbackStatusId === undefined
          ? task
          : { ...task, statusId: fallbackStatusId },
      );
  }, [sprintTasks, statuses, activeSprint.id]);

  // 필터를 거친 작업이에요. 사라진 상태(컬럼) id가 필터에 남아 있어도 무시해요(기본 상태를 고치면 id가 바뀌어요).
  const effectiveFilters = useMemo(() => {
    const statusIds = new Set(statuses.map((status) => status.id));
    return { ...filters, statuses: filters.statuses.filter((id) => statusIds.has(id)) };
  }, [filters, statuses]);
  const visibleTasks = useMemo(
    () => tasks.filter((task) => matchesFilters(task, effectiveFilters, { meId: auth?.user?.id })),
    [tasks, effectiveFilters, auth?.user?.id],
  );

  // 완료 컬럼에 카드가 너무 많으면 완료 시각이 최근인 카드만 남기고 오래된 카드는 접어요(버튼으로 펼칠 수 있어요).
  // 순서는 그대로 두고 화면에서만 숨겨요. 보드의 카드 순서·드래그는 접고 난 뒤 보이는 카드(shownTasks) 기준이에요.
  const { shownTasks, foldedByStatus } = useMemo(() => {
    const hidden = new Set();
    const counts = {};

    statuses
      .filter((status) => status.category === "DONE" && !foldOpenIds.includes(status.id))
      .forEach((status) => {
        const column = visibleTasks.filter((task) => task.statusId === status.id);
        if (column.length <= DONE_VISIBLE_LIMIT) return;

        const recent = [...column]
          .sort((a, b) => String(b.completedAt ?? "").localeCompare(String(a.completedAt ?? "")))
          .slice(0, DONE_VISIBLE_LIMIT)
          .map((task) => task.id);
        column.filter((task) => !recent.includes(task.id)).forEach((task) => hidden.add(task.id));
        counts[status.id] = column.length - DONE_VISIBLE_LIMIT;
      });

    return { shownTasks: visibleTasks.filter((task) => !hidden.has(task.id)), foldedByStatus: counts };
  }, [visibleTasks, statuses, foldOpenIds]);

  // 카드를 눌러 연 작업 편집 창이에요. 작업 데이터는 매번 id로 다시 찾아서, 창에서 고친 값이 바로 보여요.
  const [editingTaskId, setEditingTaskId] = useState(null);
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { statusId, beforeTaskId }

  // 컬럼과 같아요 — 커서가 카드 높이의 2/3 지점을 넘었는지로 "이 카드 앞"/"이 카드 뒤(=다음 카드 앞, 마지막이면 맨 끝)"를 정해요.
  // 위치는 화면에 보이는(필터·접기를 거친) 카드끼리 비교해요.
  const handleTaskDragOver = (hoveredTaskId, isAfter, statusId) => {
    if (dragTaskId === null || dragTaskId === hoveredTaskId) return;

    const columnTasks = shownTasks.filter((t) => t.statusId === statusId);
    const hoveredIndex = columnTasks.findIndex((t) => t.id === hoveredTaskId);
    const nextTask = isAfter ? columnTasks[hoveredIndex + 1] : null;
    const beforeTaskId = isAfter ? (nextTask ? nextTask.id : null) : hoveredTaskId;

    // 바로 앞 카드의 2/3를 넘으면 "다음 카드"가 자기 자신이 돼요 — 자리가 안 바뀌는 목표라 먼저 걸러요.
    if (beforeTaskId === dragTaskId) {
      setDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 같은 컬럼 안에서 자리가 안 바뀌는 경우엔 줄을 숨겨요(그 컬럼 안에서의 순서끼리 비교해요).
    const draggedTask = tasks.find((t) => t.id === dragTaskId);
    if (draggedTask?.statusId === statusId) {
      const fromIndex = columnTasks.findIndex((t) => t.id === dragTaskId);

      if (beforeTaskId === null) {
        if (fromIndex === columnTasks.length - 1) {
          setDropTarget((prev) => (prev === null ? prev : null));
          return;
        }
      } else {
        const targetIndex = columnTasks.findIndex((t) => t.id === beforeTaskId);
        if (targetIndex === fromIndex + 1) {
          setDropTarget((prev) => (prev === null ? prev : null));
          return;
        }
      }
    }

    setDropTarget((prev) =>
      prev && prev.statusId === statusId && prev.beforeTaskId === beforeTaskId
        ? prev
        : { statusId, beforeTaskId },
    );
  };

  // 빈 컬럼이나 카드 아래 빈 공간(columnEndZone)에 들어오면 "이 컬럼의 맨 끝으로"예요.
  const handleColumnEndDragEnter = (statusId) => {
    if (dragTaskId === null) return;

    const columnTasks = shownTasks.filter((t) => t.statusId === statusId);
    const fromIndex = columnTasks.findIndex((t) => t.id === dragTaskId);
    if (fromIndex !== -1 && fromIndex === columnTasks.length - 1) {
      setDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    setDropTarget((prev) =>
      prev && prev.statusId === statusId && prev.beforeTaskId === null
        ? prev
        : { statusId, beforeTaskId: null },
    );
  };

  // 드롭할 때 한 번만 옮겨요: beforeTaskId가 있으면 그 카드 앞으로, null이면 그 컬럼의 맨 끝으로(다른 컬럼이면 상태도 바뀌어요).
  // 드래그를 취소했거나(cancelled) 이미 처리된 뒤의 중복 호출이면 아무것도 옮기지 않고 드래그 상태만 지워요.
  const commitDrop = (cancelled = false) => {
    if (!cancelled && dragTaskId !== null && dropTarget) {
      // 화면 배열을 바꾸고 서버에 저장하는 건 moveTaskOnBoard가 해요.
      moveTaskOnBoard({
        taskId: dragTaskId,
        statusId: dropTarget.statusId,
        beforeTaskId: dropTarget.beforeTaskId,
      });
    }

    setDragTaskId(null);
    setDropTarget(null);
  };

  // 카드의 "..." 메뉴에서 옮기기: 이 컬럼 안의 위치(맨 위/위/아래/맨 아래) 또는 다른 컬럼으로.
  // 위치는 화면에 보이는 카드 기준이에요(필터를 걸었으면 보이는 카드끼리의 순서).
  const moveInColumn = (taskId, kind) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const column = shownTasks.filter((item) => item.statusId === task.statusId);
    const index = column.findIndex((item) => item.id === taskId);
    if (index === -1) return;

    // beforeTaskId: 이 카드 앞으로 들어가요(null이면 맨 끝).
    let beforeTaskId;
    if (kind === "top") beforeTaskId = column[0].id;
    else if (kind === "up") beforeTaskId = column[index - 1]?.id;
    else if (kind === "down") beforeTaskId = column[index + 2]?.id ?? null;
    else beforeTaskId = null;

    if (beforeTaskId === undefined || beforeTaskId === taskId) return;
    moveTaskOnBoard({ taskId, statusId: task.statusId, beforeTaskId });
  };

  const changeTaskStatus = (taskId, statusId) => moveTaskOnBoard({ taskId, statusId, beforeTaskId: null });

  // 컬럼 메뉴의 "열을 왼쪽/오른쪽으로 이동": 이웃 컬럼과 자리를 바꿔요.
  const moveColumn = (statusId, delta) => {
    const index = statuses.findIndex((status) => status.id === statusId);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= statuses.length) return;

    const next = [...statuses];
    [next[index], next[target]] = [next[target], next[index]];
    reorderStatuses(next);
  };

  // 헤더의 "스프린트 완료": 스프린트 상세의 완료와 같아요(회고가 만들어지고 끝나지 않은 작업은 백로그로 가요).
  const [completing, setCompleting] = useState(false);
  const completeSprint = async () => {
    const unfinished = tasks.filter((task) => statuses.find((s) => s.id === task.statusId)?.category !== "DONE").length;
    const ok = await confirm({
      title: "스프린트 완료",
      message: `“${activeSprint.name}” 스프린트를 완료할까요?\n회고가 만들어지고, 끝나지 않은 작업${unfinished > 0 ? ` ${unfinished}개` : ""}는 백로그로 이동해요.\n완료된 작업은 이 스프린트에 남아요.`,
      confirmLabel: "완료",
    });
    if (!ok) return;

    setCompleting(true);
    await changeSprintStatus(activeSprint.id, "COMPLETED");
    setCompleting(false);
  };

  // 컬럼(상태) 만들기/고치기/지우기 — 서버 저장과 목록 갱신은 공용 데이터(useSprintData)가 해요.
  // 새 상태는 맨 끝에 붙어요. 만들기에 성공하면 모달을 닫고, 실패하면 안내만 뜨고 모달은 그대로예요.
  const createStatus = async (data) => {
    const ok = await createStatusOnServer(data);
    if (ok) setCreateOpen(false);
  };

  // 이름/카테고리/색을 바꿔요. 기본 상태를 고치면 서버가 이 워크스페이스 전용 새 상태로 바꿔 끼우고 작업도 옮겨줘요.
  const saveStatus = (data) => saveStatusOnServer(data);

  // 상태를 지울 땐 그 상태의 작업을 모달에서 고른 상태로 옮겨요(서버가 해줘요).
  const deleteStatus = (data) => deleteStatusOnServer(data);

  return (
    <div className="kanbanPage">
      <header className="kanbanHeader">
        <div>
          <h1>칸반 보드</h1>
          <p>{activeSprint.name} · 진행 중</p>
          <SprintSummary sprint={activeSprint} />
        </div>

        <div className="kanbanHeader__actions">
          <button type="button" className="completeSprintBtn" onClick={completeSprint} disabled={completing}>
            <CircleCheck size={16} />
            스프린트 완료
          </button>

          <button type="button" className="addStatusBtn" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />새 상태 컬럼
          </button>
        </div>
      </header>

      <KanbanFilterBar
        filters={filters}
        onChange={setFilters}
        members={members}
        meId={auth?.user?.id}
        statuses={statuses}
        shownCount={visibleTasks.length}
        totalCount={tasks.length}
      />

      {/* 일부 브라우저는 dragend가 카드/컬럼까지 안 올 수 있어서, 보드가 drop을 받을 때도 두 commit을 한 번 더 불러요
          (이미 처리됐거나 해당 없는 쪽은 각자 조용히 무시해서 중복 호출이어도 안전해요). */}
      <section
        className="kanbanBoard"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          commitDrop(false);
          commitColumnDrop(false);
        }}
      >
        {statuses.map((status) => (
          <Fragment key={status.id}>
            {statusDropTarget?.beforeStatusId === status.id && (
              <div className="dropIndicatorVertical" />
            )}

            <KanbanColumn
              status={status}
              statuses={statuses}
              onStatusSave={saveStatus}
              onStatusDelete={deleteStatus}
              tasks={shownTasks.filter((task) => task.statusId === status.id)}
              totalCount={tasks.filter((task) => task.statusId === status.id).length}
              collapsed={collapsedIds.includes(status.id)}
              onToggleCollapse={() => toggleCollapsed(status.id)}
              foldedCount={foldedByStatus[status.id] ?? 0}
              foldable={
                status.category === "DONE" &&
                visibleTasks.filter((task) => task.statusId === status.id).length > DONE_VISIBLE_LIMIT
              }
              foldExpanded={foldOpenIds.includes(status.id)}
              onToggleFold={() =>
                setFoldOpenIds((prev) => (prev.includes(status.id) ? prev.filter((id) => id !== status.id) : [...prev, status.id]))
              }
              onMoveColumn={(delta) => moveColumn(status.id, delta)}
              isDragging={status.id === dragStatusId}
              onColumnDragStart={() => setDragStatusId(status.id)}
              onColumnDragOver={(isAfter) => handleColumnDragOver(status.id, isAfter)}
              onColumnDragEnd={commitColumnDrop}
              draggingTaskId={dragTaskId}
              dropTarget={dropTarget}
              onTaskDragStart={(taskId) => setDragTaskId(taskId)}
              onTaskDragOver={(taskId, isAfter) => handleTaskDragOver(taskId, isAfter, status.id)}
              onColumnEndDragEnter={() => handleColumnEndDragEnter(status.id)}
              onTaskDragEnd={commitDrop}
              onAddTask={(title) => addTask(status.id, title)}
              onTaskRename={(taskId, title) => updateTask(taskId, { title })}
              onTaskToggleSubtask={toggleSubtask}
              onTaskAddSubtask={(taskId, text) => addSubtasks(taskId, [text])}
              onTaskPriority={(taskId, priority) => updateTask(taskId, { priority })}
              onTaskDue={(taskId, dueDate) => updateTask(taskId, { dueDate })}
              onTaskMove={moveInColumn}
              onTaskChangeStatus={changeTaskStatus}
              members={members}
              meId={auth?.user?.id}
              onTaskAssigneesChange={(taskId, assignees) => updateTask(taskId, { assignees })}
              onTaskOpen={setEditingTaskId}
            />
          </Fragment>
        ))}

        {statusDropTarget?.beforeStatusId === null && (
          <div className="dropIndicatorVertical" />
        )}

        {/* 마지막 컬럼 다음의 전용 드롭 영역 — 컬럼 사이 여백이 아니라 여기 들어와야 "맨 끝으로" 처리돼요. */}
        <div
          className="boardEndZone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onDragEnter={(e) => {
            e.preventDefault();
            handleBoardEndDragEnter();
          }}
        />
      </section>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          sprintRange={{ startDate: activeSprint.startDate, endDate: activeSprint.endDate }}
          members={members}
          statuses={statuses}
          onMoveStatus={(taskId, statusId) => moveTaskOnBoard({ taskId, statusId, beforeTaskId: null })}
          onClose={() => setEditingTaskId(null)}
          onUpdateTask={updateTask}
          onToggleSubtask={toggleSubtask}
          onAddSubtask={addSubtasks}
          onRenameSubtask={renameSubtask}
          onDeleteSubtask={deleteSubtask}
          onAssignSubtask={setSubtaskAssignee}
          onMoveSubtask={moveSubtask}
          onDelete={async () => {
            const ok = await confirm({
              title: "작업 삭제",
              message: "이 작업을 삭제할까요?\n삭제한 작업은 되돌릴 수 없어요.",
              confirmLabel: "삭제",
              danger: true,
            });
            if (!ok) return;
            deleteTasks([editingTask.id]);
            setEditingTaskId(null);
          }}
        />
      )}

      {createOpen && (
        <StatusModal
          mode="create"
          statuses={statuses}
          onClose={() => setCreateOpen(false)}
          onSave={createStatus}
        />
      )}
    </div>
  );
}
