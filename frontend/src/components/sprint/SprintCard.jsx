import * as Icons from "lucide-react";
import SprintProgress from "./SprintProgress";
const status = { ACTIVE: "진행 중", PLANNING: "계획됨", COMPLETED: "완료" };
export default function SprintCard({ sprint, onNavigate }) {
  const Icon = Icons[sprint.icon];
  const remaining = sprint.total - sprint.completed;
  return (
    <article className={`sprintCard ${sprint.color}`}>
      <div className="sprintIdentity">
        <div className="sprintIcon">
          <Icon size={27} />
        </div>
        <div>
          <h2>
            {sprint.name} <span>{status[sprint.status]}</span>
          </h2>
          <p>{sprint.goal}</p>
          <small>
            ▣　{sprint.startDate} ~ {sprint.endDate}　·　{sprint.remaining}
          </small>
        </div>
      </div>
      <SprintProgress progress={sprint.progress} color={sprint.color} />
      <div className="sprintNumbers">
        <span>
          전체 작업<b>{sprint.total}</b>
        </span>
        <span>
          완료<b>{sprint.completed}</b>
        </span>
        <span>
          진행 중
          <b>{sprint.status === "PLANNING" ? 0 : Math.max(0, remaining - 2)}</b>
        </span>
        <span>
          할 일
          <b>
            {sprint.status === "PLANNING" ? remaining : Math.min(2, remaining)}
          </b>
        </span>
      </div>
      <button className="sprintDetail" onClick={() => onNavigate(sprint.id)}>
        상세보기　›
      </button>
    </article>
  );
}
