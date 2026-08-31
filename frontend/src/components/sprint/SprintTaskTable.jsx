import {
  ChevronDown,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Plus,
  Upload,
} from "lucide-react";
import { useState } from "react";

export default function SprintTaskTable({ tasks }) {
  const [openTask, setOpenTask] = useState(1);
  return (
    <section className="detailTasks">
      <header>
        <div>
          <h2>작업 목록</h2>
          <p>스프린트에 포함된 작업을 확인하고 관리하세요.</p>
        </div>
        <div>
          <button>
            <Upload size={16} /> 가져오기
          </button>
          <button>
            <Plus size={18} /> 작업 추가
          </button>
        </div>
      </header>
      <div className="taskHead">
        <span>작업</span>
        <span>담당자</span>
        <span>우선순위</span>
        <span>시작일</span>
        <span>종료일</span>
        <span>하위 작업</span>
        <span>상태</span>
        <span>작업</span>
      </div>
      {tasks.map((task) => (
        <TaskGroup
          key={task.id}
          task={task}
          open={task.id === openTask}
          onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
        />
      ))}
    </section>
  );
}

function TaskGroup({ task, open, onToggle }) {
  return (
    <div className="taskGroup">
      <div className="taskRow">
        <div className="taskName">
          <button onClick={onToggle} aria-label="하위 작업 펼치기">
            {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
          <i className={`taskDot ${task.tone}`} />
          <b>{task.title}</b>
        </div>
        <span className="assignee">
          <i>{task.assignee[0]}</i>
          {task.assignee}
        </span>
        <em className={task.priority}>{task.priority}</em>
        <time>{task.start}</time>
        <time>{task.end}</time>
        <span className="subtaskProgress">
          {task.complete} / {task.total}
          <i>
            <b style={{ width: `${(task.complete / task.total) * 100}%` }} />
          </i>
        </span>
        <mark>계획됨</mark>
        <span className="taskActions">
          <button aria-label="작업 수정">
            <Edit3 size={15} />
          </button>
          <button aria-label="추가 메뉴">
            <MoreHorizontal size={17} />
          </button>
        </span>
      </div>
      {open &&
        task.subtasks?.map((subtask) => (
          <div className="subtask" key={subtask}>
            <span className="subtaskName">
              <i>✓</i>
              {subtask}
            </span>
            <span />
            <span />
            <time>2026.09.01</time>
            <time>2026.09.01</time>
            <span />
            <mark>완료</mark>
            <span />
          </div>
        ))}
    </div>
  );
}
