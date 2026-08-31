import { ChevronRight } from "lucide-react";
import { useParams } from "react-router-dom";
import SprintDetailHero from "../components/sprint/SprintDetailHero";
import SprintDetailMetrics from "../components/sprint/SprintDetailMetrics";
import SprintTaskTable from "../components/sprint/SprintTaskTable";
import { sprints, sprintTasks } from "../mock/sprints";

export default function SprintDetail() {
  const { sprintId } = useParams();
  const sprint =
    sprints.find((item) => item.id === Number(sprintId)) || sprints[0];
  return (
    <div className="sprintDetailPage">
      <div className="breadcrumb">
        <span>스프린트</span>
        <ChevronRight size={16} />
        <b>{sprint.name}</b>
      </div>
      <SprintDetailHero sprint={sprint} />
      <SprintDetailMetrics />
      <SprintTaskTable tasks={sprintTasks} />
      <div className="detailBottomActions">
        <button>🗑　스프린트 삭제</button>
        <button>
          ▷　 스프린트 시작 <small>이 스프린트를 활성화합니다</small>
        </button>
      </div>
    </div>
  );
}
