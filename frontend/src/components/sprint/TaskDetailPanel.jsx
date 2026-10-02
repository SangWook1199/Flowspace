import { useContext, useRef, useState } from "react";
import { CalendarDays, Plus, Send, Trash2, X } from "lucide-react";
import styles from "./TaskWorkspace.module.css";
import { useAuth } from "../../context/useAuth";
import WorkspaceContext from "../../context/WorkspaceContext";
import MentionInput from "../common/MentionInput";
import MentionText from "../common/MentionText";
import { useMemberProfile } from "../../context/MemberProfileContext";
import { useTaskComments } from "../../hooks/useTaskComments";
import { toRelativeTime } from "../../api/mappers";
import { isRangeReversed, parseDateKey, percentOf, toDateKey } from "../../utils/date";

// "YYYY-MM-DD"로 끝까지 입력된, 실제로 있는 날짜인지 확인해요(2월 30일 같은 건 거절). 연도는 4자리라도
// 0002처럼 타이핑 중간 값이 올 수 있어서 1900~2999 사이만 인정해요.
const isCompleteDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const date = parseDateKey(value);
  return year >= 1900 && year <= 2999 && date !== null && toDateKey(date) === value;
};

// members(담당자 후보 이름 목록)는 부모가 내려줘요 — 이 컴포넌트가 mock을 직접 읽지 않아요.
export default function TaskDetailPanel({
  task,
  members = [],
  selectedIds,
  onChange,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onBatchChange,
  onDelete,
}) {
  // 날짜가 거절됐을 때 보여줄 메시지예요. 어느 작업에서 난 건지(id)도 같이 들고 있어서, 다른 작업으로
  // 옮기면 저절로 사라져요.
  const [dateError, setDateError] = useState({ taskId: null, message: "" });

  const batchMode = selectedIds.length > 1;
  if (batchMode)
    return (
      <BatchPanel
        members={members}
        count={selectedIds.length}
        onChange={onBatchChange}
        onDelete={onDelete}
        onClose={onClose}
      />
    );
  if (!task)
    return (
      <aside className={styles.detailPanel}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <p className={styles.emptyDetail}>
          작업을 선택하면 상세 정보를 확인할 수 있습니다.
        </p>
      </aside>
    );
  const subtasks = task.subtasks ?? [];
  const done = subtasks.filter((item) => item.checked).length;

  // 시작일이 마감일보다 늦어지거나 마감일이 시작일보다 앞서는 변경은 받아들이지 않고 이유를 보여줘요.
  const changeDate = (key, value) => {
    const range = { startDate: task.startDate, dueDate: task.dueDate, [key]: value };

    if (isRangeReversed(range.startDate, range.dueDate)) {
      setDateError({
        taskId: task.id,
        message:
          key === "startDate"
            ? "시작일은 마감일보다 늦을 수 없어요."
            : "마감일은 시작일보다 빠를 수 없어요.",
      });
      return;
    }

    setDateError({ taskId: null, message: "" });
    onChange(key, value);
  };

  return (
    <aside className={styles.detailPanel}>
      <header>
        <div>
          <small>{task.code ?? task.id}</small>
          <h2>
            <TitleInput key={task.id} value={task.title} onChange={(value) => onChange("title", value)} />
          </h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
      </header>
      <Field label="담당자">
        <select
          value={task.assignee}
          onChange={(e) => onChange("assignee", e.target.value)}
        >
          {members.map((member) => (
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
            max={task.dueDate}
            onChange={(value) => changeDate("startDate", value)}
          />
        </Field>
        <Field label="마감일">
          <DateInput
            value={task.dueDate}
            min={task.startDate}
            onChange={(value) => changeDate("dueDate", value)}
          />
        </Field>
      </div>
      {dateError.taskId === task.id && (
        <small role="alert" style={{ color: "#dc2626", display: "block", marginTop: -8, marginBottom: 12 }}>
          {dateError.message}
        </small>
      )}
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
            ({done} / {subtasks.length})
          </span>
          <i>
            <b
              style={{
                width: `${percentOf(done, subtasks.length)}%`,
              }}
            />
          </i>
        </h3>
        {subtasks.map((subtask, index) => (
          <label key={`${subtask.id ?? subtask.text}-${index}`}>
            <input
              type="checkbox"
              checked={subtask.checked}
              onChange={() => onToggleSubtask(index)}
            />
            <span>{subtask.text}</span>
            <Trash2
              size={14}
              style={{ cursor: "pointer" }}
              aria-label="하위 작업 삭제"
              onClick={(e) => {
                // label 안이라 그냥 두면 체크박스도 같이 토글돼요.
                e.preventDefault();
                onDeleteSubtask?.(index);
              }}
            />
          </label>
        ))}
        <div>
          <button type="button" onClick={() => onAddSubtask(false)}>
            <Plus size={15} /> 하위 작업 추가
          </button>
          <button type="button" onClick={() => onAddSubtask(true)}>여러 개 추가</button>
        </div>
      </div>
      <TaskComments key={task.id} taskId={task.id} />
    </aside>
  );
}

// 작업 댓글: 서버에서 불러오고, 입력창에서 Enter(또는 보내기 버튼)로 남겨요. 내가 쓴 댓글만 삭제할 수 있어요.
function TaskComments({ taskId }) {
  const me = useAuth()?.user ?? null;
  // 댓글에서 @로 멘션할 수 있는 워크스페이스 멤버들(알림은 서버가 보내요)
  const workspaceMembers = useContext(WorkspaceContext)?.members ?? [];
  const openMemberProfile = useMemberProfile();
  const { comments, loading, saving, error, add, remove } = useTaskComments(taskId);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (await add(draft)) setDraft("");
  };

  return (
    <section className={styles.comments}>
      <h3>
        댓글 <small>{comments.length}</small>
      </h3>
      <label>
        <MentionInput
          placeholder="댓글을 입력하세요... (@로 멤버 멘션)"
          value={draft}
          members={workspaceMembers}
          maxLength={1000}
          disabled={saving}
          onChange={setDraft}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter는 글자를 확정하는 키라서 보내지 않아요.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          aria-label="댓글 보내기"
          disabled={saving || !draft.trim()}
          onClick={submit}
          style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", display: "flex" }}
        >
          <Send size={16} />
        </button>
      </label>
      {error && (
        <small role="alert" style={{ color: "#dc2626", display: "block", marginTop: 6 }}>
          {error}
        </small>
      )}
      {loading && comments.length === 0 && (
        <small role="status" style={{ display: "block", marginTop: 8 }}>
          댓글을 불러오는 중이에요…
        </small>
      )}
      {comments.map((comment) => {
        const isMine = me?.id != null && comment.userId === me.id;
        return (
          <p key={comment.id}>
            <b
              className="memberLink"
              role="button"
              tabIndex={0}
              onClick={(e) => comment.userId != null && openMemberProfile(comment.userId, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && comment.userId != null) openMemberProfile(comment.userId, e.currentTarget);
              }}
            >
              {comment.author}
            </b>　<small>{toRelativeTime(comment.createdAt)}</small>
            {comment.editedAt && <small> (수정됨)</small>}
            {isMine && (
              <Trash2
                size={13}
                role="button"
                aria-label="댓글 삭제"
                style={{ cursor: "pointer", float: "right" }}
                onClick={() => remove(comment.id)}
              />
            )}
            <br />
            <MentionText text={comment.text} members={workspaceMembers} meId={me?.id ?? null} />
          </p>
        );
      })}
    </section>
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
function DateInput({ value, min, max, onChange }) {
  return (
    <label className={styles.dateInput}>
      <CalendarDays size={15} />
      <input
        type="date"
        value={value ?? ""}
        min={min || undefined}
        max={max || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// 제목은 입력하는 동안 로컬 draft로 들고 있다가, 비어있지 않을 때만 부모에게 알려요. 제목을 지운 채로
// 포커스를 잃으면 마지막으로 저장된(비어있지 않은) 제목으로 되돌리고, 앞뒤 공백은 지워서 저장해요.
function TitleInput({ value, onChange }) {
  const [draft, setDraft] = useState(value);

  return (
    <input
      aria-label="작업 제목"
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (next.trim()) onChange(next);
      }}
      onBlur={() => {
        const trimmed = draft.trim();
        if (!trimmed) {
          setDraft(value);
        } else if (trimmed !== draft) {
          setDraft(trimmed);
          onChange(trimmed);
        }
      }}
    />
  );
}

// 일괄 편집의 날짜는 타이핑 중간 값(연도를 한 글자씩 칠 때 0002, 0020…)마다 바로 적용하면 엉뚱한
// 날짜가 모든 선택 작업에 들어가요. 그래서 입력은 draft에만 담고, 입력칸을 벗어나거나(blur) Enter를
// 눌렀을 때 "끝까지 입력된 올바른 날짜"일 때만 한 번 적용해요.
function BatchDateInput({ onApply }) {
  const [draft, setDraft] = useState("");
  const appliedRef = useRef("");

  const apply = () => {
    if (!isCompleteDate(draft) || draft === appliedRef.current) return;
    appliedRef.current = draft;
    onApply(draft);
  };

  return (
    <label className={styles.dateInput}>
      <CalendarDays size={15} />
      <input
        type="date"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!e.target.value) appliedRef.current = "";
        }}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
        }}
      />
    </label>
  );
}
function BatchPanel({ members, count, onChange, onDelete, onClose }) {
  return (
    <aside className={styles.detailPanel}>
      <header>
        <h2>
          일괄 편집 <small>{count}개 선택됨</small>
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
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
          {members.map((member) => (
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
          <BatchDateInput onApply={(value) => onChange("startDate", value)} />
        </Field>
        <Field label="마감일">
          <BatchDateInput onApply={(value) => onChange("dueDate", value)} />
        </Field>
      </div>
      <button type="button" className={styles.deleteSelected} onClick={onDelete}>
        <Trash2 size={16} /> 선택한 작업 삭제
      </button>
    </aside>
  );
}
