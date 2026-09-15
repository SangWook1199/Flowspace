import { CalendarDays, Ellipsis, Flag, Archive } from "lucide-react";
import SprintProgress from "./SprintProgress";

const STATUS_LABEL = {
  PLANNING: "계획됨",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
};

export default function SprintDetailHero({ sprint }) {
  const isBacklog = sprint.status === "BACKLOG";

  return (
    <section className="detailHero">
      <div className={`detailIcon ${isBacklog ? "gray" : sprint.color}`}>
        {isBacklog ? <Archive size={36} /> : <Flag size={36} />}
      </div>

      <div className="detailTitle">
        <h1>
          {sprint.name}
          {!isBacklog && <span>{STATUS_LABEL[sprint.status]}</span>}
        </h1>

        <p>{sprint.goal}</p>

        <small>
          <CalendarDays size={15} />
          {isBacklog
            ? "스프린트 미배정"
            : `${sprint.startDate} ~ ${sprint.endDate} · ${sprint.remaining}`}
        </small>
      </div>

      <div className="detailProgress">
        <div>
          <button>
            <Ellipsis size={20} />
          </button>
          <button>{isBacklog ? "백로그 편집" : "스프린트 편집"}</button>
        </div>

        {isBacklog ? (
          <>
            <div className="backlogSummary">
              <small>미배정 작업</small>
              <h2>{sprint.total}개</h2>
            </div>

            <div className="backlogBar">
              <div />
            </div>

            <b>모든 작업이 아직 Sprint에 배정되지 않았습니다.</b>
          </>
        ) : (
          <>
            <SprintProgress progress={sprint.progress} color={sprint.color} />
            <b>
              {sprint.completed} / {sprint.total} 완료
            </b>
          </>
        )}
      </div>
    </section>
  );
}
