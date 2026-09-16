import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

import SubTaskList from "./SubTaskList";

const priorityLabel = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export default function TaskCard({ task }) {
  const [open, setOpen] = useState(false);

  const percent = (task.complete / task.total) * 100;

  return (
    <article className="kanbanCard">
      <div className="cardTop">
        <small className="cardKey">{task.code}</small>

        <button className="cardMenu">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className="cardTitle">{task.title}</h4>

      <div className="cardMeta">
        <div className="cardMembers">
          {task.assignees.map((user) => (
            <span key={user.id} className="cardAvatar" title={user.name}>
              {user.initial}
            </span>
          ))}
        </div>

        <span className={`priority ${task.priority.toLowerCase()}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>

      <div className="cardDate">
        <CalendarDays size={13} />
        {task.start} ~ {task.end}
      </div>

      <div className="cardProgress">
        <div>
          <span>하위 작업</span>
          <b>
            {task.complete}/{task.total}
          </b>
        </div>

        <div className="progressBar">
          <div className="progressFill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <button className="subtaskToggle" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        하위 작업 {task.subtasks?.length ?? 0}개
      </button>

      {open && <SubTaskList subtasks={task.subtasks ?? []} />}
    </article>
  );
}
