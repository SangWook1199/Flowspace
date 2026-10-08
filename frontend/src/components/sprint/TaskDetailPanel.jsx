import { useCallback, useContext, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, GripVertical, Plus, Send, Trash2, UserPlus, X } from "lucide-react";
import styles from "./TaskWorkspace.module.css";
import UserAvatar from "./UserAvatar";
import useDismiss from "./useDismiss";
import { useAuth } from "../../context/useAuth";
import useDialog from "../../context/useDialog";
import WorkspaceContext from "../../context/WorkspaceContext";
import AssigneePicker from "./AssigneePicker";
import PrioritySelect from "./PrioritySelect";
import RichTextEditor from "./RichTextEditor";
import MentionInput from "../common/MentionInput";
import MentionText from "../common/MentionText";
import { useMemberProfile } from "../../context/MemberProfileContext";
import { useTaskComments } from "../../hooks/useTaskComments";
import { toRelativeTime } from "../../api/mappers";
import { formatDateDots, isRangeReversed, parseDateKey, percentOf, toDateKey } from "../../utils/date";
import { htmlToText, textToHtml } from "../../utils/sanitizeHtml";

// 설명은 서식 있는 글(HTML)로 저장돼요. 에디터가 없던 때 쓴 줄바꿈뿐인 글(태그도 &nbsp; 같은 기호도 없는 글)만
// 처음 열 때 한 번 줄바꿈이 보이게 바꿔요. (타이핑 중에는 바꾸지 않아요 — 스페이스가 &nbsp;로 저장되는데
// 그걸 다시 글자로 취급하면 "&amp;nbsp;"가 쌓이고 커서가 튀어요.)
const DESCRIPTION_MAX = 5000;
const looksLikeHtml = (text) => /<[a-z][\s\S]*>|&(nbsp|amp|lt|gt|quot|#\d+);/i.test(text ?? "");
const toEditorHtml = (text) => (looksLikeHtml(text) ? text : textToHtml(text));

// "YYYY-MM-DD"로 끝까지 입력된, 실제로 있는 날짜인지 확인해요(2월 30일 같은 건 거절). 연도는 4자리라도
// 0002처럼 타이핑 중간 값이 올 수 있어서 1900~2999 사이만 인정해요.
const isCompleteDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const date = parseDateKey(value);
  return year >= 1900 && year <= 2999 && date !== null && toDateKey(date) === value;
};

// members(담당자 후보인 워크스페이스 멤버 목록)는 부모가 내려줘요 — 이 컴포넌트가 mock을 직접 읽지 않아요.
export default function TaskDetailPanel({
  task,
  sprintRange = null,
  members = [],
  statuses = [],
  onStatusChange,
  selectedIds,
  onChange,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onRenameSubtask,
  onAssignSubtask,
  onMoveSubtask,
  onDeleteSubtask,
  onBatchChange,
  onDelete,
  onDeleteTask,
}) {
  // 날짜가 거절됐을 때 보여줄 메시지예요. 어느 작업에서 난 건지(id)도 같이 들고 있어서, 다른 작업으로
  // 옮기면 저절로 사라져요.
  const [dateError, setDateError] = useState({ taskId: null, message: "" });
  const { confirm } = useDialog();

  // 체크한 작업이 하나라도 있으면 오른쪽에 일괄 편집이 떠요(하나만 체크해도 담당자·우선순위·기간·삭제를 바로 할 수 있어요).
  const batchMode = selectedIds.length > 0;
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
  // 작업 날짜가 스프린트 기간을 벗어나면 안내해요(저장은 막지 않아요).
  const outOfSprint =
    Boolean(sprintRange?.startDate && sprintRange?.endDate) &&
    [task.startDate, task.dueDate].some((value) => value && (value < sprintRange.startDate || value > sprintRange.endDate));

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
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
      </header>
      <div className={styles.field}>
        <span>제목</span>
        <TitleInput key={task.id} value={task.title} onChange={(value) => onChange("title", value)} />
      </div>
      {/* 상태(칸반 컬럼)는 부모가 목록과 변경 함수를 줄 때만 보여줘요 — 고르면 그 컬럼 맨 아래로 옮겨요. */}
      {onStatusChange && statuses.length > 0 && (
        <div className={styles.field}>
          <span>상태</span>
          <select value={task.statusId ?? ""} onChange={(e) => onStatusChange(Number(e.target.value))}>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.field}>
        <span>담당자</span>
        <AssigneePicker members={members} value={task.assignees ?? []} onChange={(list) => onChange("assignees", list)} />
      </div>
      <div className={styles.field}>
        <span>우선순위</span>
        <PrioritySelect value={task.priority} onChange={(value) => onChange("priority", value)} />
      </div>
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
      {outOfSprint && (
        <small className={styles.dateWarn} role="status">
          스프린트 기간({formatDateDots(sprintRange.startDate)} ~ {formatDateDots(sprintRange.endDate)}) 밖의 날짜가 있어요.
        </small>
      )}
      {dateError.taskId === task.id && (
        <small role="alert" style={{ color: "#dc2626", display: "block", marginTop: -8, marginBottom: 12 }}>
          {dateError.message}
        </small>
      )}
      <DescriptionField key={`description-${task.id}`} description={task.description} onChange={(html) => onChange("description", html)} />
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
        {subtasks.length === 0 && <small className={styles.emptyHint}>아직 하위 작업이 없어요.</small>}
        <SubtaskList
          subtasks={subtasks}
          taskAssignees={task.assignees ?? []}
          onToggle={onToggleSubtask}
          onRename={(subtaskId, text) => onRenameSubtask?.(subtaskId, text)}
          onAssign={(subtaskId, assigneeId) => onAssignSubtask?.(subtaskId, assigneeId)}
          onMove={(from, to) => onMoveSubtask?.(from, to)}
          onDelete={async (index) => {
            const ok = await confirm({ title: "하위 작업 삭제", message: "이 하위 작업을 삭제할까요?", confirmLabel: "삭제", danger: true });
            if (ok) onDeleteSubtask?.(index);
          }}
        />
        <SubtaskAdd key={`subtask-add-${task.id}`} onAdd={onAddSubtask} />
      </div>
      <TaskComments key={`comments-${task.id}`} taskId={task.id} />
      {onDeleteTask && (
        <button type="button" className={styles.deleteSelected} onClick={onDeleteTask}>
          <Trash2 size={16} /> 작업 삭제
        </button>
      )}
    </aside>
  );
}

// 작업 설명 에디터예요. 처음 열 때의 값만 에디터에 넣고(작업을 바꾸면 key로 새로 시작해요), 그 뒤로는 에디터가
// 알려주는 값을 저장만 해요 — 저장된 값을 다시 에디터에 밀어넣으면 커서가 튀어요.
function DescriptionField({ description, onChange }) {
  const [initialHtml] = useState(() => toEditorHtml(description));
  const [tooLong, setTooLong] = useState(false);

  return (
    <div className={styles.field}>
      <span>설명</span>
      <RichTextEditor
        label=""
        value={initialHtml}
        maxLength={DESCRIPTION_MAX}
        placeholder="작업에 대한 설명을 작성하세요. (선택)"
        hint="글머리 기호, 번호 목록, 링크를 쓸 수 있어요."
        onChange={(html) => {
          // 너무 길면 저장하지 않고 안내해요(서버가 거절하기 전에 막아요).
          if (htmlToText(html).length > DESCRIPTION_MAX) {
            setTooLong(true);
            return;
          }
          setTooLong(false);
          onChange(html);
        }}
      />
      {tooLong && (
        <small role="alert" style={{ color: "#dc2626", display: "block", marginTop: 6 }}>
          설명이 너무 길어서 저장하지 않았어요. {DESCRIPTION_MAX.toLocaleString()}자 이하로 줄여주세요.
        </small>
      )}
    </div>
  );
}

// 하위 작업 목록이에요. 왼쪽 손잡이(⋮⋮)를 끌어서 순서를 바꿔요(손잡이에 포커스를 두고 위/아래 화살표 키로도 돼요).
function SubtaskList({ subtasks, taskAssignees, onToggle, onRename, onAssign, onMove, onDelete }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // 마우스 높이(Y)로 "몇 번째 줄 자리"인지 계산해요. 줄 사이 틈이나 맨 아래 빈 곳에 놓아도 가장 가까운 자리로 들어가요.
  const indexAt = (container, clientY) => {
    const rows = Array.from(container.children);
    for (let i = 0; i < rows.length; i += 1) {
      const box = rows[i].getBoundingClientRect();
      if (clientY < box.top + box.height / 2) return i;
    }
    return rows.length - 1;
  };

  return (
    <div
      className={styles.subtaskList}
      onDragOver={(e) => {
        if (dragIndex === null) return;
        e.preventDefault();
        setOverIndex(indexAt(e.currentTarget, e.clientY));
      }}
      onDrop={(e) => {
        if (dragIndex === null) return;
        e.preventDefault();
        const target = indexAt(e.currentTarget, e.clientY);
        if (target !== dragIndex) onMove(dragIndex, target);
        endDrag();
      }}
    >
      {subtasks.map((subtask, index) => (
        <SubtaskRow
          key={`${subtask.id}-${subtask.text}`}
          subtask={subtask}
          taskAssignees={taskAssignees}
          dragging={dragIndex === index}
          dropMark={dragIndex !== null && overIndex === index && dragIndex !== index ? (dragIndex < index ? "down" : "up") : ""}
          isFirst={index === 0}
          isLast={index === subtasks.length - 1}
          onToggle={() => onToggle(index)}
          onRename={(text) => onRename(subtask.id, text)}
          onAssign={(assigneeId) => onAssign(subtask.id, assigneeId)}
          onDelete={() => onDelete(index)}
          onMoveBy={(step) => onMove(index, index + step)}
          onDragStart={() => setDragIndex(index)}
          onDragEnd={endDrag}
        />
      ))}
    </div>
  );
}

// 하위 작업 한 줄이에요. 순서 손잡이, 체크, 이름(눌러서 바로 고쳐요: Enter나 입력칸을 벗어나면 저장), 담당자, 삭제.
function SubtaskRow({
  subtask,
  taskAssignees,
  dragging,
  dropMark,
  isFirst,
  isLast,
  onToggle,
  onRename,
  onAssign,
  onDelete,
  onMoveBy,
  onDragStart,
  onDragEnd,
}) {
  const [draft, setDraft] = useState(subtask.text);
  const rowRef = useRef(null);

  const commit = () => {
    const text = draft.trim();
    if (!text) setDraft(subtask.text);
    else if (text !== subtask.text) onRename(text);
  };

  return (
    <div
      ref={rowRef}
      className={`${styles.subtaskRow}${dragging ? ` ${styles.subtaskDragging}` : ""}${dropMark === "up" ? ` ${styles.subtaskDropUp}` : ""}${dropMark === "down" ? ` ${styles.subtaskDropDown}` : ""}`}
    >
      <span
        className={styles.subtaskGrip}
        role="button"
        tabIndex={0}
        draggable
        title="끌어서 순서 바꾸기"
        aria-label="하위 작업 순서 바꾸기 (위/아래 화살표 키)"
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", subtask.text);
          if (rowRef.current) e.dataTransfer.setDragImage(rowRef.current, 12, 14);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onMoveBy(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onMoveBy(1);
          }
        }}
      >
        <GripVertical size={14} />
      </span>
      <input type="checkbox" checked={subtask.checked} onChange={onToggle} aria-label="완료 표시" />
      <input
        className={`${styles.subtaskInput}${subtask.checked ? ` ${styles.subtaskDone}` : ""}`}
        aria-label="하위 작업 이름"
        value={draft}
        maxLength={300}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(subtask.text);
            e.currentTarget.blur();
          }
        }}
      />
      <span className={styles.subtaskMove}>
        <button type="button" aria-label="위로 이동" disabled={isFirst} onClick={() => onMoveBy(-1)}>
          <ChevronUp size={12} />
        </button>
        <button type="button" aria-label="아래로 이동" disabled={isLast} onClick={() => onMoveBy(1)}>
          <ChevronDown size={12} />
        </button>
      </span>
      <SubtaskAssignee assignees={taskAssignees} value={subtask.assigneeId} onChange={onAssign} />
      <button type="button" className={styles.subtaskDelete} aria-label="하위 작업 삭제" onClick={onDelete}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// 하위 작업 담당자 선택: 이 작업의 담당자 중에서만 고를 수 있어요(작업 담당자가 없으면 먼저 지정하라고 안내해요).
function SubtaskAssignee({ assignees, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrapRef, close);

  const current = assignees.find((user) => user.id === value) ?? null;
  const disabled = assignees.length === 0;

  const pick = (id) => {
    setOpen(false);
    onChange(id);
  };

  return (
    <div className={styles.subAssignee} ref={wrapRef}>
      <button
        type="button"
        className={styles.subAssigneeBtn}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `담당자 ${current.name}` : "담당자 지정"}
        title={disabled ? "작업 담당자를 먼저 지정하세요" : (current?.name ?? "담당자 지정")}
        onClick={() => setOpen((prev) => !prev)}
      >
        {current ? <UserAvatar user={current} /> : <UserPlus size={14} />}
      </button>

      {open && (
        <ul className={`${styles.pickerMenu} ${styles.subAssigneeMenu}`} role="listbox" aria-label="하위 작업 담당자">
          <li role="option" aria-selected={value == null}>
            <button type="button" className={value == null ? styles.picked : ""} onClick={() => pick(null)}>
              <span className={styles.pickerName}>담당자 없음</span>
            </button>
          </li>
          {assignees.map((user) => (
            <li key={user.id} role="option" aria-selected={user.id === value}>
              <button type="button" className={user.id === value ? styles.picked : ""} onClick={() => pick(user.id)}>
                <UserAvatar user={user} />
                <span className={styles.pickerName}>{user.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 새 하위 작업을 이름과 함께 바로 추가해요(Enter 또는 추가 버튼).
function SubtaskAdd({ onAdd }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  };

  return (
    <form className={styles.subtaskAdd} onSubmit={submit}>
      <input
        aria-label="새 하위 작업 이름"
        placeholder="하위 작업을 입력하고 Enter"
        value={text}
        maxLength={300}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={!text.trim()}>
        <Plus size={15} /> 추가
      </button>
    </form>
  );
}

// 작업 댓글: 서버에서 불러오고, 입력창에서 Enter(또는 보내기 버튼)로 남겨요. 내가 쓴 댓글만 삭제할 수 있어요.
function TaskComments({ taskId }) {
  const me = useAuth()?.user ?? null;
  // 댓글에서 @로 멘션할 수 있는 워크스페이스 멤버들(알림은 서버가 보내요)
  const workspaceMembers = useContext(WorkspaceContext)?.members ?? [];
  const openMemberProfile = useMemberProfile();
  const { confirm } = useDialog();
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
      {!loading && !error && comments.length === 0 && (
        <small className={styles.emptyHint} style={{ marginTop: 10 }}>
          아직 댓글이 없어요.
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
            </b>{"\u3000"}<small>{toRelativeTime(comment.createdAt)}</small>
            {comment.editedAt && <small> (수정됨)</small>}
            {isMine && (
              <Trash2
                size={13}
                role="button"
                aria-label="댓글 삭제"
                style={{ cursor: "pointer", float: "right" }}
                onClick={async () => {
                  const ok = await confirm({ title: "댓글 삭제", message: "이 댓글을 삭제할까요?\n삭제한 댓글은 되돌릴 수 없어요.", confirmLabel: "삭제", danger: true });
                  if (ok) remove(comment.id);
                }}
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
      className={styles.titleInput}
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
      <Field label="담당자 추가">
        <select
          value=""
          onChange={(e) => onChange("assignee", e.target.value)}
        >
          <option value="">변경 안 함</option>
          {members.map((member) => (
            <option key={member.id} value={member.name}>{member.name}</option>
          ))}
        </select>
      </Field>
      <div className={styles.field}>
        <span>우선순위</span>
        <PrioritySelect emptyLabel="변경 안 함" onChange={(value) => onChange("priority", value)} />
      </div>
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
