import { useState } from "react";
import SubtaskList from "./SubtaskList";

export default function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);

  const completed = task.subtasks.filter((item) => item.done).length;
  const total = task.subtasks.length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  const priorityClass = {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  }[task.priority];

  const priorityLabel = {
    HIGH: "높음",
    MEDIUM: "보통",
    LOW: "낮음",
  }[task.priority];

  return (
    <article className="task-card">
      <div className="task-card__top">
        <span className="task-id">{task.id}</span>

        <button className="task-more">⋯</button>
      </div>

      <h4 className="task-title">{task.title}</h4>

      {/* ---------- Task Info ---------- */}
      <div className="task-info">
        {/* 1줄 : 담당자 + 우선순위 */}
        <div className="task-info__top">
          <div className="task-user-group">
            <div className="task-user">
              <div className="avatar">{task.assignee.avatar}</div>
              <span>{task.assignee.name}</span>
            </div>

            <span className={`priority ${priorityClass}`}>{priorityLabel}</span>
          </div>
        </div>

        {/* 2줄 : 날짜 + 하위 작업 */}
        <div className="task-info__bottom">
          <span className="task-date">
            {task.startDate} ~ {task.endDate}
          </span>

          <button
            className="subtask-summary"
            onClick={() => setExpanded(!expanded)}
          >
            <span>
              {completed} / {total}
            </span>
            <span className={`arrow ${expanded ? "open" : ""}`}>▼</span>
          </button>
        </div>
      </div>

      {/* 진행 중 / 완료만 진행률 표시 */}
      {(task.status === "DOING" || task.status === "DONE") && (
        <div className="task-progress">
          <div
            className={`task-progress__fill ${
              task.status === "DONE" ? "done" : "doing"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 하위 작업 펼치기 */}
      {expanded && <SubtaskList subtasks={task.subtasks} />}
    </article>
  );
}
