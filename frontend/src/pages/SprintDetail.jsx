import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import SprintDetailHero from "../components/sprint/SprintDetailHero";
import SprintDetailMetrics from "../components/sprint/SprintDetailMetrics";
import SprintTaskTable from "../components/sprint/SprintTaskTable";

export default function SprintDetail() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
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
  } = useOutletContext() ?? {};
  const [busy, setBusy] = useState(false);

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

  const handleStart = async () => {
    if (!window.confirm(`“${sprint.name}” 스프린트를 시작할까요?`)) return;

    setBusy(true);
    await changeSprintStatus(sprint.id, "ACTIVE");
    setBusy(false);
  };

  // 완료하면 회고가 만들어지고 끝나지 않은 작업은 백로그로 가요.
  const handleComplete = async () => {
    if (!window.confirm(`“${sprint.name}” 스프린트를 완료할까요?\n회고가 만들어지고 모든 작업이 백로그로 이동해요.`)) return;

    setBusy(true);
    await changeSprintStatus(sprint.id, "COMPLETED");
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`“${sprint.name}” 스프린트를 삭제할까요?\n속한 작업은 백로그로 이동해요.`)) return;

    setBusy(true);
    const deleted = await deleteSprint(sprint.id);
    setBusy(false);
    if (deleted) navigate("/sprints");
  };

  return (
    <div className="sprintDetailPage">
      <div className="breadcrumb">
        <span>스프린트</span>
        <ChevronRight size={16} />
        <b>{sprint.name}</b>
      </div>

      <SprintDetailHero sprint={sprint} />

      <SprintDetailMetrics isBacklog={isBacklog} tasks={tasks} />

      <SprintTaskTable key={sprintId} tasks={tasks} onAdd={goTasks} />

      <div className="detailBottomActions">
        {isBacklog ? (
          <>
            <button type="button" onClick={goTasks}>+ 새 작업 추가</button>
            <button type="button" onClick={goTasks}>
              Sprint에 배정
              <small>작업을 선택해 스프린트로 이동</small>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleDelete} disabled={busy}>🗑 스프린트 삭제</button>
            {sprint.status === "PLANNING" && (
              <button type="button" onClick={handleStart} disabled={busy}>
                ▶ 스프린트 시작
                <small>이 스프린트를 활성화합니다</small>
              </button>
            )}
            {sprint.status === "ACTIVE" && (
              <button type="button" onClick={handleComplete} disabled={busy}>
                ✔ 스프린트 완료
                <small>회고를 만들고 작업을 백로그로 이동합니다</small>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
