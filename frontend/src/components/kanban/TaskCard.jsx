import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

import SubtaskList from "./SubtaskList";
import { KANBAN_DRAG_MIME } from "./kanbanDrag";
import { formatDateDots, percentOf } from "../../utils/date";

const priorityLabel = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

// onDragEnd(cancelled)의 cancelled는 Esc로 취소했거나 보드 밖에 놓아서 드롭이 일어나지 않았다는 뜻이에요.
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
  const percent = percentOf(complete, total);

  // 우선순위/담당자/날짜가 비어 있는 작업도(API에서 아직 안 정한 값) 카드가 깨지지 않게 해요.
  const priority = typeof task.priority === "string" ? task.priority : "";
  const hasDates = Boolean(task.startDate || task.dueDate);

  return (
    <article
      className={`kanbanCard ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox는 dataTransfer에 데이터가 하나도 없으면 드래그를 시작하지 않아서 전용 MIME으로 넣어둬요.
        e.dataTransfer.setData(KANBAN_DRAG_MIME, JSON.stringify({ type: "task", id: task.id }));
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
      onDragEnd={(e) => onDragEnd?.(e.dataTransfer.dropEffect === "none")}
    >
      <div className="cardTop">
        <small className="cardKey">{task.id}</small>

        <button type="button" className="cardMenu" aria-label={`${task.id} 작업 메뉴`}>
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className="cardTitle">{task.title}</h4>

      <div className="cardMeta">
        <div className="cardMembers">
          {(task.assignees ?? []).map((user, index) => (
            <span key={`${user?.id ?? "none"}-${index}`} className="cardAvatar" title={user?.name}>
              {user?.initial ?? user?.name?.[0] ?? ""}
            </span>
          ))}
        </div>

        {priority && (
          <span className={`priority ${priority.toLowerCase()}`}>
            {priorityLabel[priority] ?? priority}
          </span>
        )}
      </div>

      <div className="cardDate">
        <CalendarDays size={13} />
        {hasDates ? `${formatDateDots(task.startDate)} ~ ${formatDateDots(task.dueDate)}` : "일정 없음"}
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

      <button type="button" className="subtaskToggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        하위 작업 {total}개
      </button>

      {open && <SubtaskList subtasks={subtasks} />}
    </article>
  );
}
