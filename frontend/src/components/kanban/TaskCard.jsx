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

// "2025-05-28" → "2025.05.28". 공용 태스크 모델(mock/sprintTasks.js)의
// 날짜는 스프린트 작업 목록과 맞춰 하이픈(ISO) 형식이라, 칸반 카드에서
// 원래 쓰던 점(.) 표기로 보이게만 바꿔줘요.
function formatDotDate(iso) {
  return iso ? iso.replaceAll("-", ".") : "";
}

export default function TaskCard({
  task,
  isDragging = false,
  onDragStart,
  onDragOverCard,
  onDragEnd,
}) {
  const [open, setOpen] = useState(false);

  // complete/total을 따로 저장해두지 않고 매번 subtasks에서 세요 —
  // 서브태스크 체크 상태(스프린트 작업 목록이나 페이지 TASK 블록에서
  // 바뀔 수 있어요)와 진행률 표시가 어긋날 일이 없어져요.
  const subtasks = task.subtasks ?? [];
  const complete = subtasks.filter((s) => s.checked).length;
  const total = subtasks.length;
  const percent = total ? (complete / total) * 100 : 0;

  return (
    <article
      className={`kanbanCard ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();

        // 카드 경계를 완전히 넘어야만 반응하는 게 아니라, 카드 높이의
        // 2/3 지점을 기준으로 "이 카드 앞"/"이 카드 뒤"를 판단해요 —
        // 커서가 카드 안에서 움직이는 동안 계속 다시 계산돼요.
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        onDragOverCard?.(ratio >= 2 / 3);
      }}
      onDrop={(e) => e.preventDefault()}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="cardTop">
        <small className="cardKey">{task.id}</small>

        <button className="cardMenu">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className="cardTitle">{task.title}</h4>

      <div className="cardMeta">
        <div className="cardMembers">
          {(task.assignees ?? []).map((user) => (
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
        {formatDotDate(task.startDate)} ~ {formatDotDate(task.dueDate)}
      </div>

      <div className="cardProgress">
        <div>
          <span>하위 작업</span>
          <b>
            {complete}/{total}
          </b>
        </div>

        <div className="progressBar">
          <div className="progressFill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <button className="subtaskToggle" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        하위 작업 {total}개
      </button>

      {open && <SubTaskList subtasks={subtasks} />}
    </article>
  );
}
