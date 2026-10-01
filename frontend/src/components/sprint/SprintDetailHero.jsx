import { CalendarDays, Ellipsis, Flag, Archive } from "lucide-react";
import SprintProgress from "./SprintProgress";
import { formatDateDots } from "../../utils/date";
import { SPRINT_STATUS_LABEL, sprintPercent, sprintRemainingLabel } from "../../utils/sprint";

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
          {!isBacklog && <span>{SPRINT_STATUS_LABEL[sprint.status] ?? sprint.status}</span>}
        </h1>

        <p>{sprint.goal}</p>

        <small>
          <CalendarDays size={15} />
          {isBacklog
            ? "스프린트 미배정"
            : `${formatDateDots(sprint.startDate)} ~ ${formatDateDots(sprint.endDate)}${
                sprintRemainingLabel(sprint) ? ` · ${sprintRemainingLabel(sprint)}` : ""
              }`}
        </small>
      </div>

      <div className="detailProgress">
        <div>
          <button type="button" aria-label="더보기">
            <Ellipsis size={20} />
          </button>
          <button type="button">{isBacklog ? "백로그 편집" : "스프린트 편집"}</button>
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
            <SprintProgress progress={sprintPercent(sprint)} color={sprint.color} />
            <b>
              {sprint.completed ?? 0} / {sprint.total ?? 0} 완료
            </b>
          </>
        )}
      </div>
    </section>
  );
}
