import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import SprintDetailHero from "../components/sprint/SprintDetailHero";
import SprintDetailMetrics from "../components/sprint/SprintDetailMetrics";
import SprintTaskTable from "../components/sprint/SprintTaskTable";
import { sprints, backlogSprint, backlogTasks } from "../mock/sprints";
import { statuses } from "../mock/kanban";

// 상태 id → 카테고리("TODO" | "IN_PROGRESS" | "DONE"). 작업 표/지표는 "할 일·진행 중·완료"로 나눠서
// 보여주는데, 작업 자체는 칸반 상태 id만 갖고 있어서 여기서 한 번 풀어줘요.
const categoryByStatusId = Object.fromEntries(statuses.map((status) => [status.id, status.category]));

export default function SprintDetail() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  // 작업은 칸반/스프린트 작업 목록과 같은 공용 상태(MainLayout)를 읽어요 — 어디서 고치든 여기도 따라와요.
  const { sprintTasks = [] } = useOutletContext() ?? {};

  const isBacklog = sprintId === "backlog";

  // id가 없거나 숫자가 아니거나 목록에 없으면 null이에요(예전엔 조용히 첫 번째 스프린트를 대신 보여줬어요).
  const found = isBacklog
    ? backlogSprint
    : (sprints.find((item) => String(item.id) === sprintId) ?? null);

  const tasks = useMemo(() => {
    if (!found) return [];

    const own = isBacklog ? backlogTasks : sprintTasks.filter((task) => task.sprintId === found.id);
    return own.map((task) => ({ ...task, status: categoryByStatusId[task.statusId] ?? "TODO" }));
  }, [found, isBacklog, sprintTasks]);

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

  return (
    <div className="sprintDetailPage">
      <div className="breadcrumb">
        <span>스프린트</span>
        <ChevronRight size={16} />
        <b>{sprint.name}</b>
      </div>

      <SprintDetailHero sprint={sprint} />

      <SprintDetailMetrics isBacklog={isBacklog} tasks={tasks} />

      <SprintTaskTable key={sprintId} tasks={tasks} />

      <div className="detailBottomActions">
        {isBacklog ? (
          <>
            <button type="button">+ 새 작업 추가</button>
            <button type="button">
              Sprint에 배정
              <small>선택한 작업을 스프린트로 이동</small>
            </button>
          </>
        ) : (
          <>
            <button type="button">🗑 스프린트 삭제</button>
            <button type="button">
              ▶ 스프린트 시작
              <small>이 스프린트를 활성화합니다</small>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
