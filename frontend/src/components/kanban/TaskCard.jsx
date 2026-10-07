import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus } from "lucide-react";

import SubtaskList from "./SubtaskList";
import TaskCardMenu from "./TaskCardMenu";
import { DuePopover, PriorityPopover } from "./CardQuickEdit";
import UserAvatar, { UnassignedAvatar } from "../sprint/UserAvatar";
import AssigneePopover from "./AssigneePopover";
import { KANBAN_DRAG_MIME } from "./kanbanDrag";
import { dueInfo } from "./kanbanUtils";
import { percentOf } from "../../utils/date";

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
  members = [],
  meId = null,
  onAssigneesChange,
  onOpen,
  onRename,
  onToggleSubtask,
  onAddSubtask,
  isDone = false,
  statuses = [],
  isFirst = false,
  isLast = false,
  onMoveInColumn,
  onChangeStatus,
  onChangePriority,
  onChangeDue,
}) {
  const [open, setOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeBtnRef = useRef(null);
  // "..." 메뉴, 우선순위·마감일 빠른 변경 팝업. 한 번에 하나만 열려요.
  const [popup, setPopup] = useState(null); // "menu" | "priority" | "due" | null
  const menuBtnRef = useRef(null);
  const priorityBtnRef = useRef(null);
  const dueBtnRef = useRef(null);
  const closePopup = () => setPopup(null);
  const togglePopup = (name) => (e) => {
    e.stopPropagation();
    setAssigneeOpen(false);
    setPopup((prev) => (prev === name ? null : name));
  };
  // 하위 작업 옆 "+"를 누르면 목록을 펼치고 입력칸이 나와요. 추가하는 동안만 입력칸이 보이고,
  // 입력칸 바깥을 누르거나 Esc를 누르면 그만둬요(쓰던 글은 버려요). "+"로 펼친 목록이면 다시 접어요.
  const [adding, setAdding] = useState(false);
  const openedByAdd = useRef(false);
  const addAreaRef = useRef(null);
  const addBtnRef = useRef(null);
  const stopAdding = () => {
    setAdding(false);
    if (openedByAdd.current) {
      openedByAdd.current = false;
      setOpen(false);
    }
  };
  useEffect(() => {
    if (!adding) return undefined;
    const onPointerDown = (e) => {
      if (addAreaRef.current?.contains(e.target) || addBtnRef.current?.contains(e.target)) return;
      setAdding(false);
      if (openedByAdd.current) {
        openedByAdd.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [adding]);
  // 제목 이름만 바로 고치는 입력(연필 버튼). 그동안은 카드를 드래그하지 않아요.
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const startRename = (e) => {
    e.stopPropagation();
    setDraftTitle(task.title ?? "");
    setRenaming(true);
  };
  const commitRename = () => {
    const next = draftTitle.trim();
    setRenaming(false);
    if (next && next !== task.title) onRename?.(next);
  };

  // complete/total을 따로 저장해두지 않고 매번 subtasks에서 세요 —
  // 서브태스크 체크 상태(스프린트 작업 목록이나 페이지 TASK 블록에서
  // 바뀔 수 있어요)와 진행률 표시가 어긋날 일이 없어져요.
  const subtasks = task.subtasks ?? [];
  const complete = subtasks.filter((s) => s.checked).length;
  const total = subtasks.length;
  const percent = percentOf(complete, total);

  // 우선순위/담당자가 비어 있는 작업도(API에서 아직 안 정한 값) 카드가 깨지지 않게 해요.
  const priority = typeof task.priority === "string" ? task.priority : "";
  const assignees = task.assignees ?? [];
  // 완료된 작업은 마감 표시를 하지 않아요.
  const due = isDone ? null : dueInfo(task.dueDate);

  return (
    <article
      className={`kanbanCard ${isDragging ? "dragging" : ""}`}
      draggable={!renaming}
      tabIndex={0}
      // 카드(버튼·입력칸·하위 작업 목록·팝업이 아닌 곳)를 누르면 작업 편집 창이 열려요.
      onClick={(e) => {
        if (e.target.closest("button, a, input, .subtaskList, .floatingPanel")) return;
        onOpen?.();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.();
        }
      }}
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
      {/* 첫 줄: 제목 + 오른쪽 끝에 이름만 고치는 연필 */}
      <div className="cardHead">
        {renaming ? (
          <input
            autoFocus
            className="cardTitleInput"
            aria-label="작업 이름"
            value={draftTitle}
            maxLength={200}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <>
            <h4 className="cardTitle" title={task.title}>{task.title}</h4>
            <button type="button" className="cardEditBtn" aria-label="작업 이름 수정" title="이름 수정" onClick={startRename}>
              <Pencil size={13} />
            </button>
            <button
              type="button"
              ref={menuBtnRef}
              className={`cardEditBtn${popup === "menu" ? " is-open" : ""}`}
              aria-label="작업 설정"
              title="설정"
              aria-haspopup="menu"
              aria-expanded={popup === "menu"}
              onClick={togglePopup("menu")}
            >
              <MoreHorizontal size={15} />
            </button>
          </>
        )}
      </div>

      {/* 둘째 줄: 우선순위 · D-day, 오른쪽 끝에 담당자 */}
      <div className="cardMeta">
        {/* 우선순위·D-day 배지를 누르면 카드에서 바로 바꿀 수 있어요. */}
        {priority && (
          <button
            type="button"
            ref={priorityBtnRef}
            className={`priority ${priority.toLowerCase()} badgeBtn`}
            title="우선순위 변경"
            aria-haspopup="menu"
            aria-expanded={popup === "priority"}
            onClick={togglePopup("priority")}
          >
            {priorityLabel[priority] ?? priority}
          </button>
        )}

        {due && (
          <button
            type="button"
            ref={dueBtnRef}
            className={`dueBadge ${due.tone} badgeBtn`}
            title={`${task.dueDate} · 마감일 변경`}
            aria-haspopup="dialog"
            aria-expanded={popup === "due"}
            onClick={togglePopup("due")}
          >
            {due.label}
          </button>
        )}

        {/* 담당자 영역을 누르면 간단한 배정 팝업이 떠요(카드 드래그와는 따로 동작해요). */}
        <button
          type="button"
          ref={assigneeBtnRef}
          className={`cardAssignees${assigneeOpen ? " is-open" : ""}`}
          title={assignees.length > 0 ? assignees.map((user) => user?.name).filter(Boolean).join(", ") : "담당자 배정"}
          aria-haspopup="dialog"
          aria-expanded={assigneeOpen}
          onClick={(e) => {
            e.stopPropagation();
            setPopup(null);
            setAssigneeOpen((prev) => !prev);
          }}
        >
          {assignees.length === 0 ? (
            <UnassignedAvatar />
          ) : (
            <>
              {assignees.slice(0, 3).map((user, index) => (
                <UserAvatar key={`${user?.id ?? "none"}-${index}`} user={user} className="cardAvatarItem" />
              ))}
              {assignees.length > 3 && <span className="cardAssigneeMore">+{assignees.length - 3}</span>}
            </>
          )}
        </button>

        {assigneeOpen && (
          <AssigneePopover
            anchor={assigneeBtnRef.current}
            members={members}
            value={assignees}
            meId={meId}
            onChange={(list) => onAssigneesChange?.(list)}
            onClose={() => setAssigneeOpen(false)}
          />
        )}
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

      {/* 하위 작업이 없으면 카드 크기는 그대로 두고, 펼침 화살표만 없애고 눌러도 아무 일 없게 해요.
          오른쪽 "+"는 목록을 펼치고 바로 하위 작업을 추가해요. */}
      <div className="subtaskBar">
        <button
          type="button"
          className="subtaskToggle"
          onClick={() => {
            if (total === 0) return;
            setOpen(!open);
            setAdding(false);
            openedByAdd.current = false;
          }}
          aria-expanded={total > 0 ? open : undefined}
          aria-disabled={total === 0 || undefined}
        >
          {total > 0 && (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
          하위 작업 {total}개
        </button>

        {onAddSubtask && (
          <button
            type="button"
            ref={addBtnRef}
            className="subtaskAddBtn"
            aria-label="하위 작업 추가"
            title="하위 작업 추가"
            onClick={() => {
              if (!open) openedByAdd.current = true;
              setOpen(true);
              setAdding(true);
            }}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {open && (
        <div ref={addAreaRef}>
          <SubtaskList
            subtasks={subtasks}
            onToggle={onToggleSubtask}
            onAdd={onAddSubtask}
            adding={adding}
            onCancelAdd={stopAdding}
          />
        </div>
      )}

      {popup === "menu" && (
        <TaskCardMenu
          anchor={menuBtnRef.current}
          statuses={statuses}
          currentStatusId={task.statusId}
          isFirst={isFirst}
          isLast={isLast}
          onMove={onMoveInColumn}
          onChangeStatus={onChangeStatus}
          onClose={closePopup}
        />
      )}

      {popup === "priority" && (
        <PriorityPopover anchor={priorityBtnRef.current} value={priority} onChange={onChangePriority} onClose={closePopup} />
      )}

      {popup === "due" && (
        <DuePopover
          anchor={dueBtnRef.current}
          value={task.dueDate}
          minDate={task.startDate}
          onChange={onChangeDue}
          onClose={closePopup}
        />
      )}
    </article>
  );
}
