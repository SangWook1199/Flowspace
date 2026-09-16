import { ChevronRight } from "lucide-react";
import { useParams } from "react-router-dom";
import SprintDetailHero from "../components/sprint/SprintDetailHero";
import SprintDetailMetrics from "../components/sprint/SprintDetailMetrics";
import SprintTaskTable from "../components/sprint/SprintTaskTable";
import {
  sprints,
  sprintTasks,
  backlogSprint,
  backlogTasks,
} from "../mock/sprints";

export default function SprintDetail() {
  const { sprintId } = useParams();

  const isBacklog = sprintId === "backlog";

  const sprint = isBacklog
    ? backlogSprint
    : sprints.find((item) => item.id === Number(sprintId)) || sprints[0];

  const tasks = isBacklog ? backlogTasks : sprintTasks;

  return (
    <div className="sprintDetailPage">
      <div className="breadcrumb">
        <span>스프린트</span>
        <ChevronRight size={16} />
        <b>{sprint.name}</b>
      </div>

      <SprintDetailHero sprint={sprint} />

      <SprintDetailMetrics isBacklog={isBacklog} tasks={tasks} />

      <SprintTaskTable tasks={tasks} />

      <div className="detailBottomActions">
        {isBacklog ? (
          <>
            <button>+ 새 작업 추가</button>
            <button>
              Sprint에 배정
              <small>선택한 작업을 스프린트로 이동</small>
            </button>
          </>
        ) : (
          <>
            <button>🗑 스프린트 삭제</button>
            <button>
              ▶ 스프린트 시작
              <small>이 스프린트를 활성화합니다</small>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
