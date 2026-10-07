import {
  ChevronDown,
  ChevronRight,
  Flag,
  Plus,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { formatDateDots, percentOf } from "../../utils/date";
import { useMemberProfile } from "../../context/MemberProfileContext";

// tasks는 공용 작업 모델(assignees 객체 배열, startDate/dueDate, subtasks {text, checked})에
// 상태 카테고리 status("TODO" | "IN_PROGRESS" | "DONE")를 얹은 모양이에요.
// onImport가 있을 때만 "가져오기" 버튼을 보여줘요(백로그·완료된 스프린트에서는 안 넘겨요).
export default function SprintTaskTable({ tasks = [], onAdd, onImport }) {
  // 하위 작업은 처음엔 모두 접어 두고, 화살표를 눌러야 펼쳐져요.
  const [openTask, setOpenTask] = useState(null);

  return (
    <section className="detailTasks">
      <header>
        <div>
          <h2>작업 목록</h2>
          <p>스프린트에 포함된 작업을 확인하고 관리하세요.</p>
        </div>

        <div>
          {onImport && (
            <button type="button" onClick={onImport}>
              <Upload size={16} />
              가져오기
            </button>
          )}
          {onAdd && (
            <button type="button" onClick={onAdd}>
              <Plus size={18} />
              작업 추가
            </button>
          )}
        </div>
      </header>

      {/* 작업이 몇 개든 목록 높이는 고정이에요. 넘치면 이 안에서 스크롤되고, 열 제목은 위에 붙어 있어요. */}
      <div className="taskListBody">
        <div className="taskHead">
          <span />
          <span>번호</span>
          <span>제목</span>
          <span>담당자</span>
          <span>우선순위</span>
          <span>시작일</span>
          <span>마감일</span>
          <span>하위 작업</span>
          <span>상태</span>
        </div>

        {tasks.length === 0 && <p className="taskListEmpty">작업이 없어요.</p>}

        {tasks.map((task) => (
          <TaskGroup
            key={task.id}
            task={task}
            open={task.id === openTask}
            onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
          />
        ))}
      </div>
    </section>
  );
}

function TaskGroup({ task, open, onToggle }) {
  const openMemberProfile = useMemberProfile();
  const assignees = task.assignees ?? [];
  const subtasks = task.subtasks ?? [];
  const complete = subtasks.filter((subtask) => subtask?.checked).length;

  const priorityClass =
    task.priority === "HIGH" || task.priority === "높음"
      ? "high"
      : task.priority === "MEDIUM" || task.priority === "보통"
        ? "medium"
        : "low";

  const priorityLabel =
    task.priority === "HIGH"
      ? "높음"
      : task.priority === "MEDIUM"
        ? "보통"
        : task.priority === "LOW"
          ? "낮음"
          : task.priority;

  const status =
    task.status === "DONE"
      ? "완료"
      : task.status === "IN_PROGRESS"
        ? "진행 중"
        : "계획됨";

  return (
    <div className="taskGroup">
      <div className="taskRow">
        {/* 하위 작업 펼침 화살표는 맨 왼쪽 칸에 둬요. */}
        <span className="taskToggleCell">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${task.title} 하위 작업 ${open ? "접기" : "펼치기"}`}
          >
            {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
        </span>

        <span className="taskCode">{task.code ?? task.id}</span>

        <div className="taskName">
          <b title={task.title}>{task.title}</b>
        </div>

        <div className="assigneeStack">
          {assignees.map((assignee, index) => {
            const name = typeof assignee === "string" ? assignee : assignee?.name;
            const assigneeId = typeof assignee === "string" ? null : (assignee?.id ?? null);
            return (
              <span
                key={`${name}-${index}`}
                className={`assigneeAvatar${assigneeId != null ? " memberAvatarLink" : ""}`}
                title={name}
                role={assigneeId != null ? "button" : undefined}
                tabIndex={assigneeId != null ? 0 : undefined}
                onClick={(e) => {
                  if (assigneeId == null) return;
                  e.stopPropagation();
                  openMemberProfile(assigneeId, e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (assigneeId != null && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    e.stopPropagation();
                    openMemberProfile(assigneeId, e.currentTarget);
                  }
                }}
              >
                {typeof assignee === "string" ? assignee[0] : (assignee?.initial ?? name?.[0])}
              </span>
            );
          })}
        </div>

        <em className={priorityClass}>
          <Flag size={14} />
          {priorityLabel}
        </em>

        <time>{formatDateDots(task.startDate)}</time>
        <time>{formatDateDots(task.dueDate)}</time>

        <span className="subtaskProgress">
          {complete} / {subtasks.length}
          <i>
            <b style={{ width: `${percentOf(complete, subtasks.length)}%` }} />
          </i>
        </span>

        <mark>{status}</mark>

        {/* 편집·더보기 버튼은 기능이 없어서 뺐어요. */}
      </div>

      {open &&
        subtasks.map((subtask, index) => {
          // 하위 작업은 문자열(옛 데이터)이거나 { id, text, checked } 객체예요. 완료 여부를 알 수 있을
          // 때만 "완료/미완료"를 보여주고, 모르면 상태 칸을 비워둬요(무조건 완료라고 하지 않아요).
          const text = typeof subtask === "string" ? subtask : subtask?.text;
          const known = typeof subtask === "object" && typeof subtask?.checked === "boolean";
          const done = known && subtask.checked;
          const owner = typeof subtask === "object" ? assignees.find((a) => typeof a === "object" && a?.id === subtask?.assigneeId) : null;

          return (
            <div className="subtask" key={`${subtask?.id ?? text}-${index}`}>
              <span />
              <span />

              <span className="subtaskName">
                <i
                  aria-hidden="true"
                  style={known && !done ? { borderColor: "#cbd5e1", color: "transparent" } : undefined}
                />
                {text}
              </span>

              {/* 하위 작업 담당자 — 작업에 배치된 담당자 중 한 명이에요. */}
              <div className="assigneeStack">
                {owner && (
                  <span className="assigneeAvatar" title={owner.name}>
                    {owner.initial ?? owner.name?.[0]}
                  </span>
                )}
              </div>
              <span />

              <time>{formatDateDots(task.startDate)}</time>
              <time>{formatDateDots(task.dueDate)}</time>

              <span />

              <mark>{known ? (done ? "완료" : "미완료") : ""}</mark>
            </div>
          );
        })}
    </div>
  );
}
