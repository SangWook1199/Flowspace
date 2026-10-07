import { Archive, CalendarDays, CircleCheck, Flag, Hourglass } from "lucide-react";
import SprintProgress from "./SprintProgress";
import { formatDateDots } from "../../utils/date";
import { SPRINT_STATUS_LABEL, sprintPercent, sprintRemainingLabel } from "../../utils/sprint";

// 서버가 주는 icon 이름 → 실제 아이콘. 목록에 없는 이름이 와도(오타, 새 아이콘) 카드가 깨지지 않게 Flag로 대신해요.
const SPRINT_ICONS = { Flag, CalendarDays, CircleCheck, Hourglass, Archive };

export default function SprintCard({ sprint, onNavigate }) {
  const Icon = SPRINT_ICONS[sprint.icon] ?? Flag;
  const remaining = sprintRemainingLabel(sprint);

  return (
    <article className={`sprintCard ${sprint.color}`}>
      <div className="sprintIdentity">
        <div className="sprintIcon">
          <Icon size={27} />
        </div>
        <div>
          <h2>
            {sprint.name} <span>{SPRINT_STATUS_LABEL[sprint.status] ?? sprint.status}</span>
          </h2>
          <p>{sprint.goal}</p>
          <small>
            <CalendarDays size={13} />
            {formatDateDots(sprint.startDate)} ~ {formatDateDots(sprint.endDate)}
            {remaining && `　·　${remaining}`}
          </small>
        </div>
      </div>
      <SprintProgress progress={sprintPercent(sprint)} color={sprint.color} />
      {/* 숫자는 전부 스프린트 데이터 필드 그대로예요 — 진행 중/할 일을 남은 개수에서 어림해서
          계산하던 걸 없앴어요(데이터에 없으면 0으로 보여줘요). */}
      <div className="sprintNumbers">
        <span>
          전체 작업<b>{sprint.total ?? 0}</b>
        </span>
        <span>
          완료<b>{sprint.completed ?? 0}</b>
        </span>
        <span>
          진행 중
          <b>{sprint.inProgress ?? 0}</b>
        </span>
        <span>
          할 일
          <b>{sprint.todo ?? 0}</b>
        </span>
      </div>
      <button type="button" className="sprintDetail" onClick={() => onNavigate(sprint.id)}>
        상세보기　›
      </button>
    </article>
  );
}
