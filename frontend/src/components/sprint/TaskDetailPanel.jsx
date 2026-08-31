import { CalendarDays, CheckSquare, Plus, Send, Trash2, X } from "lucide-react";
import styles from "./TaskWorkspace.module.css";
import { taskMembers } from "../../mock/sprintTasks";

export default function TaskDetailPanel({
  task,
  selectedIds,
  onChange,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onBatchChange,
  onDelete,
}) {
  const batchMode = selectedIds.length > 1;
  if (batchMode)
    return (
      <BatchPanel
        count={selectedIds.length}
        onChange={onBatchChange}
        onDelete={onDelete}
        onClose={onClose}
      />
    );
  if (!task)
    return (
      <aside className={styles.detailPanel}>
        <button className={styles.close} onClick={onClose}>
          <X size={20} />
        </button>
        <p className={styles.emptyDetail}>
          작업을 선택하면 상세 정보를 확인할 수 있습니다.
        </p>
      </aside>
    );
  const done = task.subtasks.filter((item) => item.checked).length;
  return (
    <aside className={styles.detailPanel}>
      <header>
        <div>
          <small>{task.id}</small>
          <h2>
            <input
              value={task.title}
              onChange={(e) => onChange("title", e.target.value)}
            />
          </h2>
        </div>
        <button className={styles.close} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <Field label="담당자">
        <select
          value={task.assignee}
          onChange={(e) => onChange("assignee", e.target.value)}
        >
          {taskMembers.map((member) => (
            <option key={member}>{member}</option>
          ))}
        </select>
      </Field>
      <Field label="우선순위">
        <select
          value={task.priority}
          onChange={(e) => onChange("priority", e.target.value)}
        >
          <option>높음</option>
          <option>보통</option>
          <option>낮음</option>
        </select>
      </Field>
      <div className={styles.dateFields}>
        <Field label="시작일">
          <DateInput
            value={task.startDate}
            onChange={(value) => onChange("startDate", value)}
          />
        </Field>
        <Field label="마감일">
          <DateInput
            value={task.dueDate}
            onChange={(value) => onChange("dueDate", value)}
          />
        </Field>
      </div>
      <Field label="설명">
        <textarea
          value={task.description}
          maxLength="1000"
          onChange={(e) => onChange("description", e.target.value)}
        />
      </Field>
      <div className={styles.subtasks}>
        <h3>
          하위 작업{" "}
          <span>
            ({done} / {task.subtasks.length})
          </span>
          <i>
            <b
              style={{
                width: `${task.subtasks.length ? (done / task.subtasks.length) * 100 : 0}%`,
              }}
            />
          </i>
        </h3>
        {task.subtasks.map((subtask, index) => (
          <label key={`${subtask.text}-${index}`}>
            <input
              type="checkbox"
              checked={subtask.checked}
              onChange={() => onToggleSubtask(index)}
            />
            <span>{subtask.text}</span>
            <Trash2 size={14} />
          </label>
        ))}
        <div>
          <button onClick={() => onAddSubtask(false)}>
            <Plus size={15} /> 하위 작업 추가
          </button>
          <button onClick={() => onAddSubtask(true)}>여러 개 추가</button>
        </div>
      </div>
      <section className={styles.comments}>
        <h3>
          댓글 <small>1</small>
        </h3>
        <label>
          <input placeholder="댓글을 입력하세요..." />
          <Send size={16} />
        </label>
        <p>
          <b>서연</b>　<small>3시간 전</small>
          <br />
          토큰 만료 시간은 30분으로 설정하면 좋을 것 같아요.
        </p>
      </section>
    </aside>
  );
}
function Field({ label, children }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function DateInput({ value, onChange }) {
  return (
    <label className={styles.dateInput}>
      <CalendarDays size={15} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function BatchPanel({ count, onChange, onDelete, onClose }) {
  return (
    <aside className={styles.detailPanel}>
      <header>
        <h2>
          일괄 편집 <small>{count}개 선택됨</small>
        </h2>
        <button className={styles.close} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <p className={styles.batchHint}>
        선택한 작업에 적용할 항목만 변경하세요.
      </p>
      <Field label="담당자">
        <select
          defaultValue=""
          onChange={(e) => onChange("assignee", e.target.value)}
        >
          <option value="">변경 안 함</option>
          {taskMembers.map((member) => (
            <option key={member}>{member}</option>
          ))}
        </select>
      </Field>
      <Field label="우선순위">
        <select
          defaultValue=""
          onChange={(e) => onChange("priority", e.target.value)}
        >
          <option value="">변경 안 함</option>
          <option>높음</option>
          <option>보통</option>
          <option>낮음</option>
        </select>
      </Field>
      <div className={styles.dateFields}>
        <Field label="시작일">
          <DateInput
            value=""
            onChange={(value) => onChange("startDate", value)}
          />
        </Field>
        <Field label="마감일">
          <DateInput
            value=""
            onChange={(value) => onChange("dueDate", value)}
          />
        </Field>
      </div>
      <button className={styles.deleteSelected} onClick={onDelete}>
        <Trash2 size={16} /> 선택한 작업 삭제
      </button>
    </aside>
  );
}
