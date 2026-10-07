import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Play, Plus, Trash2 } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import SprintDetailHero from "../components/sprint/SprintDetailHero";
import SprintDetailMetrics from "../components/sprint/SprintDetailMetrics";
import SprintTaskTable from "../components/sprint/SprintTaskTable";
import ImportTasksModal from "../components/sprint/ImportTasksModal";
import useDialog from "../context/useDialog";

export default function SprintDetail() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { confirm, notify } = useDialog();
  // 스프린트·작업·칸반 상태는 서버에서 불러와 MainLayout(WorkspaceProvider)이 내려줘요.
  // 칸반/스프린트 작업 목록과 같은 데이터라 어디서 고치든 여기도 따라와요.
  const {
    sprints = [],
    backlog,
    taskStatuses = [],
    sprintTasks = [],
    sprintDataLoading,
    sprintDataError,
    reloadSprintData,
    changeSprintStatus,
    deleteSprint,
    updateTask,
    deleteTasks,
  } = useOutletContext() ?? {};
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isBacklog = sprintId === "backlog";

  // 상태 id → 카테고리("TODO" | "IN_PROGRESS" | "DONE"). 작업 표/지표는 "할 일·진행 중·완료"로 나눠서
  // 보여주는데, 작업 자체는 칸반 상태 id만 갖고 있어서 여기서 한 번 풀어줘요.
  const categoryByStatusId = useMemo(
    () => Object.fromEntries(taskStatuses.map((status) => [status.id, status.category])),
    [taskStatuses],
  );

  // id가 없거나 숫자가 아니거나 목록에 없으면 null이에요(예전엔 조용히 첫 번째 스프린트를 대신 보여줬어요).
  const found = isBacklog ? backlog : (sprints.find((item) => String(item.id) === sprintId) ?? null);

  const tasks = useMemo(() => {
    if (!found) return [];

    const ownerId = isBacklog ? null : found.id;
    return sprintTasks
      .filter((task) => task.sprintId === ownerId)
      .map((task) => ({ ...task, status: categoryByStatusId[task.statusId] ?? "TODO" }));
  }, [found, isBacklog, sprintTasks, categoryByStatusId]);

  // 가져오기 목록: 백로그와 끝나지 않은 다른 스프린트(진행 중 → 계획됨 순)의 작업이에요.
  // 완료된 스프린트의 작업은 완료할 때 이미 백로그로 옮겨져서 따로 넣지 않아요.
  const importGroups = useMemo(() => {
    if (!found || isBacklog) return [];

    const withStatus = (task) => ({ ...task, status: categoryByStatusId[task.statusId] ?? "TODO" });
    const order = { ACTIVE: 0, PLANNING: 1 };

    const sprintGroups = sprints
      .filter((item) => item.id !== found.id && item.status !== "COMPLETED")
      .sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2))
      .map((item) => ({
        key: `sprint-${item.id}`,
        name: item.name,
        isBacklog: false,
        tasks: sprintTasks.filter((task) => task.sprintId === item.id).map(withStatus),
      }));

    return [
      {
        key: "backlog",
        name: "백로그",
        isBacklog: true,
        tasks: sprintTasks.filter((task) => task.sprintId === null).map(withStatus),
      },
      ...sprintGroups,
    ];
  }, [found, isBacklog, sprints, sprintTasks, categoryByStatusId]);

  if (sprintDataLoading) {
    return (
      <div className="sprintDetailPage">
        <p className="emptySprints" role="status">스프린트를 불러오는 중이에요…</p>
      </div>
    );
  }

  if (sprintDataError) {
    return (
      <div className="sprintDetailPage">
        <div className="emptySprints" role="alert">
          <p>{sprintDataError}</p>
          <button type="button" className="sprintDetail" onClick={reloadSprintData}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!found) {
    return (
      <div className="sprintDetailPage">
        <div className="emptySprints" role="alert">
          <p>스프린트를 찾을 수 없어요</p>
          <button type="button" className="sprintDetail" onClick={() => navigate("/sprints")}>
            ‹ 스프린트 목록으로
          </button>
        </div>
      </div>
    );
  }

  // 백로그는 요약 숫자를 따로 저장하지 않고 작업 목록에서 세어요.
  const sprint = isBacklog
    ? { ...found, total: tasks.length, completed: tasks.filter((task) => task.status === "DONE").length }
    : found;

  const goTasks = () => navigate(`/sprints/${sprint.id}/tasks`);

  // 체크한 작업을 지워요. 지운 작업은 되돌릴 수 없어서 한 번 더 물어보고, 지웠으면 true를 돌려줘요.
  const handleDeleteTasks = async (taskIds) => {
    if (taskIds.length === 0) return false;
    const ok = await confirm({
      title: "작업 삭제",
      message: `선택한 작업 ${taskIds.length}개를 삭제할까요?\n삭제한 작업은 되돌릴 수 없어요.`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return false;

    deleteTasks(taskIds);
    return true;
  };

  // 고른 작업을 이 스프린트로 옮겨요(복사가 아니라 이동이고, 순서는 서버가 정해요).
  const handleImport = (taskIds) => {
    taskIds.forEach((id) => updateTask(id, { sprintId: sprint.id }));
    setImportOpen(false);
  };

  const handleStart = async () => {
    // 진행 중인 스프린트는 하나만 둘 수 있어요(칸반도 그 스프린트를 보여줘요).
    const otherActive = sprints.find((item) => item.status === "ACTIVE" && item.id !== sprint.id);
    if (otherActive) {
      notify(`“${otherActive.name}” 스프린트가 진행 중이에요.\n먼저 완료한 뒤 시작해 주세요.`);
      return;
    }

    const ok = await confirm({ title: "스프린트 시작", message: `“${sprint.name}” 스프린트를 시작할까요?`, confirmLabel: "시작" });
    if (!ok) return;

    setBusy(true);
    await changeSprintStatus(sprint.id, "ACTIVE");
    setBusy(false);
  };

  // 완료하면 회고가 만들어지고, 끝나지 않은 작업만 백로그로 가요(완료된 작업은 이 스프린트에 남아요).
  const handleComplete = async () => {
    const ok = await confirm({
      title: "스프린트 완료",
      message: `“${sprint.name}” 스프린트를 완료할까요?\n회고가 만들어지고, 끝나지 않은 작업은 백로그로 이동해요.\n완료된 작업은 이 스프린트에 남아요.`,
      confirmLabel: "완료",
    });
    if (!ok) return;

    setBusy(true);
    await changeSprintStatus(sprint.id, "COMPLETED");
    setBusy(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "스프린트 삭제",
      message: `“${sprint.name}” 스프린트를 삭제할까요?\n속한 작업은 모두 백로그로 이동해요.`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    const deleted = await deleteSprint(sprint.id);
    setBusy(false);
    if (deleted) navigate("/sprints");
  };

  return (
    <div className="sprintDetailPage">
      <div className="breadcrumb">
        <button type="button" className="breadcrumbLink" onClick={() => navigate("/sprints")}>
          스프린트
        </button>
        <ChevronRight size={16} />
        <b>{sprint.name}</b>
      </div>

      <SprintDetailHero
        sprint={sprint}
        onEdit={isBacklog ? undefined : () => navigate(`/sprints/${sprint.id}/edit`)}
      />

      <SprintDetailMetrics isBacklog={isBacklog} tasks={tasks} />

      <SprintTaskTable
        key={sprintId}
        tasks={tasks}
        onDeleteTasks={sprint.status === "COMPLETED" ? undefined : handleDeleteTasks}
        onOpenTask={(task) => navigate(`/sprints/${sprint.id}/tasks?task=${task.id}`)}
        onAdd={sprint.status === "COMPLETED" ? undefined : goTasks}
        onImport={!isBacklog && sprint.status !== "COMPLETED" ? () => setImportOpen(true) : undefined}
      />

      {importOpen && (
        <ImportTasksModal
          sprint={sprint}
          groups={importGroups}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}

      <div className="detailBottomActions">
        {isBacklog ? (
          <>
            <button type="button" onClick={goTasks}>
              <span className="actionLabel">
                <Plus size={17} />
                새 작업 추가
              </span>
            </button>
            <button type="button" onClick={goTasks}>
              <span className="actionLabel">
                <ArrowRight size={16} />
                Sprint에 배정
              </span>
              <small>작업을 선택해 스프린트로 이동</small>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="dangerAction" onClick={handleDelete} disabled={busy}>
              <span className="actionLabel">
                <Trash2 size={17} />
                스프린트 삭제
              </span>
            </button>
            {sprint.status === "PLANNING" && (
              <button type="button" onClick={handleStart} disabled={busy}>
                <span className="actionLabel">
                  <Play size={16} />
                  스프린트 시작
                </span>
                <small>이 스프린트를 활성화합니다</small>
              </button>
            )}
            {sprint.status === "ACTIVE" && (
              <button type="button" onClick={handleComplete} disabled={busy}>
                <span className="actionLabel">
                  <CircleCheck size={17} />
                  스프린트 완료
                </span>
                <small>회고를 만들고 끝나지 않은 작업을 백로그로 이동합니다</small>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
