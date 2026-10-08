import { useState, useRef, useEffect, Fragment } from "react";
import { ChevronRight, GripVertical, MoreHorizontal, Plus } from "lucide-react";

import TaskCard from "./TaskCard";
import StatusModal from "./StatusModal";
import DeleteStatusModal from "./DeleteStatusModal";
import { KANBAN_DRAG_MIME } from "./kanbanDrag";

// 데이터는 전부 부모(Kanban 페이지)가 props로 내려줘요. tasks는 필터를 거친 작업이고, totalCount는 필터 전 개수예요.
// onColumnDragEnd/onTaskDragEnd(cancelled)의 cancelled는 Esc나 보드 밖 드롭으로 취소됐다는 뜻이에요.
// onAddTask(title)은 만들기에 성공하면 true를 돌려주는 Promise예요(실패하면 입력을 그대로 둬요).
// collapsed면 좁은 띠로 접혀요. foldable이면 완료 컬럼의 오래된 카드를 접고 펼치는 버튼(foldedCount개가 접힌 상태)이 나와요.
export default function KanbanColumn({
  status,
  statuses = [],
  onStatusSave,
  onStatusDelete,
  tasks,
  totalCount = tasks.length,
  isDragging = false,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragEnd,
  draggingTaskId = null,
  dropTarget = null,
  onTaskDragStart,
  onTaskDragOver,
  onColumnEndDragEnter,
  onTaskDragEnd,
  onAddTask,
  members = [],
  meId = null,
  onTaskAssigneesChange,
  onTaskOpen,
  onTaskRename,
  onTaskToggleSubtask,
  onTaskAddSubtask,
  onTaskPriority,
  onTaskDue,
  onTaskMove,
  onTaskChangeStatus,
  onMoveColumn,
  collapsed = false,
  onToggleCollapse,
  foldedCount = 0,
  foldable = false,
  foldExpanded = false,
  onToggleFold,
}) {
  const [menu, setMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // "작업 추가"를 누르면 이름 입력칸이 열려요(Enter로 만들고, Esc/취소로 닫아요).
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const endZoneRef = useRef(null);
  // 성공했을 때만 입력을 비우고 새 카드가 보이게 컬럼을 맨 아래로 스크롤해요(실패하면 이름이 남아 있어요).
  const submitNew = async (e) => {
    e.preventDefault();
    const value = newTitle.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      if (await onAddTask?.(value)) {
        setNewTitle("");
        setTimeout(() => endZoneRef.current?.scrollIntoView({ block: "nearest" }), 50);
      }
    } finally {
      setSubmitting(false);
    }
  };
  const closeNew = () => {
    setAdding(false);
    setNewTitle("");
  };
  // 입력칸 바깥을 눌러도 "취소"를 누른 것과 똑같이 닫혀요.
  const addFormRef = useRef(null);
  useEffect(() => {
    if (!adding) return undefined;
    const onPointerDown = (e) => {
      if (!addFormRef.current?.contains(e.target)) closeNew();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [adding]);

  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const columnRef = useRef(null);

  // 메뉴 항목(수정/삭제 버튼)은 모달을 열면서 사라지니까, 모달이 닫히면 포커스를 "..." 버튼으로 돌려줘요.
  const restoreMenuFocus = () => {
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const columnIndex = statuses.findIndex((item) => item.id === status.id);
  // 필터에 맞는 작업 수(접어서 안 보이는 카드도 포함)예요. 필터가 없으면 전체 개수와 같아요.
  const matchedCount = tasks.length + foldedCount;
  const wip = status.wipLimit ?? null;
  const overWip = wip !== null && totalCount > wip;

  // 접힌 컬럼은 이름·개수만 세로로 보여주는 좁은 띠예요. 누르면 펼쳐져요.
  if (collapsed) {
    return (
      <article className="kanbanColumn is-collapsed">
        <button
          type="button"
          className="columnCollapsedBtn"
          aria-label={`${status.name} 컬럼 펼치기 (${totalCount}개)`}
          aria-expanded="false"
          onClick={onToggleCollapse}
        >
          <ChevronRight size={16} />
          <i className={`columnDot ${(status.color ?? "").toLowerCase()}`} />
          <span className={`columnCollapsedName${overWip ? " is-over" : ""}`}>{status.name}</span>
          <b className={overWip ? "is-over" : ""}>{wip !== null ? `${totalCount}/${wip}` : totalCount}</b>
        </button>
      </article>
    );
  }

  return (
    <>
      <article className={`kanbanColumn ${isDragging ? "dragging" : ""}${overWip ? " is-overWip" : ""}`} ref={columnRef}>
        {/* 컬럼 순서는 헤더를 끌어서 바꿔요(HTML5 드래그 앤 드롭). 드래그 이미지는 헤더만이 아니라 컬럼 전체로 하고,
            커서가 헤더 너비의 2/3 지점을 넘었는지로 "이 컬럼 앞/뒤"를 정해 부모(Kanban.jsx)에 알려요. */}
        <header
          className="columnHeader"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            // Firefox는 dataTransfer에 데이터가 없으면 드래그를 시작하지 않아요.
            e.dataTransfer.setData(KANBAN_DRAG_MIME, JSON.stringify({ type: "column", id: status.id }));

            if (columnRef.current) {
              const rect = columnRef.current.getBoundingClientRect();
              e.dataTransfer.setDragImage(
                columnRef.current,
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
            }

            onColumnDragStart?.();
          }}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onColumnDragOver?.(ratio >= 2 / 3);
          }}
          onDrop={(e) => e.preventDefault()}
          onDragEnd={(e) => onColumnDragEnd?.(e.dataTransfer.dropEffect === "none")}
        >
          <div className="columnTitle">
            <GripVertical size={14} className="columnGrip" />
            <i className={`columnDot ${(status.color ?? "").toLowerCase()}`} />
            <h3>{status.name}</h3>
            <span
              className={`columnCount${overWip ? " is-over" : ""}`}
              title={wip !== null ? `작업 수 제한 ${wip}개${overWip ? " — 넘었어요" : ""}` : undefined}
            >
              {wip !== null ? `${totalCount}/${wip}` : matchedCount === totalCount ? matchedCount : `${matchedCount}/${totalCount}`}
            </span>
          </div>

          {/* 기본 상태(할 일·진행 중·완료)도 고치거나 지울 수 있어요. 고치면 이 워크스페이스 전용 새 상태로 바뀌고, 지우면
              이 워크스페이스에서만 안 보여요(공용 값은 서버가 그대로 둬요). 마지막 하나 남은 상태는 지울 수 없어요. */}
          <div className="columnMenuWrap" ref={menuRef}>
            <button
              type="button"
              className="columnMenu"
              ref={menuButtonRef}
              aria-label={`${status.name} 컬럼 메뉴`}
              aria-haspopup="true"
              aria-expanded={menu}
              onClick={() => setMenu((prev) => !prev)}
            >
              <MoreHorizontal size={18} />
            </button>

            {menu && (
              <div className="columnDropdown">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(true);
                    setMenu(false);
                  }}
                >
                  상태 수정
                </button>

                <button
                  type="button"
                  disabled={columnIndex <= 0}
                  onClick={() => {
                    onMoveColumn?.(-1);
                    setMenu(false);
                  }}
                >
                  열을 왼쪽으로 이동
                </button>

                <button
                  type="button"
                  disabled={columnIndex === -1 || columnIndex >= statuses.length - 1}
                  onClick={() => {
                    onMoveColumn?.(1);
                    setMenu(false);
                  }}
                >
                  열을 오른쪽으로 이동
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse?.();
                    setMenu(false);
                  }}
                >
                  열 접기
                </button>

                {statuses.length > 1 && onStatusDelete && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setDeleteOpen(true);
                      setMenu(false);
                    }}
                  >
                    상태 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 카드 위에서는 커서가 카드 높이의 2/3 지점을 넘었는지로 "이 카드 앞/뒤"를 부모에 알려요(실제 이동은 드롭할
            때 한 번만, Kanban.jsx의 commitDrop). 빈 컬럼이나 카드 아래 빈 공간은 마지막의 columnEndZone이 받아요. */}
        <div
          className="columnBody"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          {tasks.map((task, index) => (
            <Fragment key={task.id}>
              {dropTarget?.statusId === status.id &&
                dropTarget.beforeTaskId === task.id && (
                  <div className="dropIndicator" />
                )}

              <TaskCard
                task={task}
                members={members}
                meId={meId}
                onAssigneesChange={(assignees) => onTaskAssigneesChange?.(task.id, assignees)}
                onOpen={() => onTaskOpen?.(task.id)}
                onRename={(title) => onTaskRename?.(task.id, title)}
                onToggleSubtask={(index) => onTaskToggleSubtask?.(task.id, index)}
                onAddSubtask={(text) => onTaskAddSubtask?.(task.id, text)}
                onChangePriority={(priority) => onTaskPriority?.(task.id, priority)}
                onChangeDue={(dueDate) => onTaskDue?.(task.id, dueDate)}
                statuses={statuses}
                isFirst={index === 0}
                isLast={index === tasks.length - 1}
                onMoveInColumn={(kind) => onTaskMove?.(task.id, kind)}
                onChangeStatus={(statusId) => onTaskChangeStatus?.(task.id, statusId)}
                isDone={status.category === "DONE"}
                isDragging={task.id === draggingTaskId}
                onDragStart={() => onTaskDragStart?.(task.id)}
                onDragOverCard={(isAfter) => onTaskDragOver?.(task.id, isAfter)}
                onDragEnd={(cancelled) => onTaskDragEnd?.(cancelled)}
              />
            </Fragment>
          ))}

          {dropTarget?.statusId === status.id &&
            dropTarget.beforeTaskId === null && (
              <div className="dropIndicator" />
            )}

          {foldable && (
            <button type="button" className="columnFoldBtn" onClick={onToggleFold}>
              {foldExpanded ? "오래된 완료 작업 접기" : `오래된 완료 작업 ${foldedCount}개 더 보기`}
            </button>
          )}

          {tasks.length === 0 && draggingTaskId === null && (
            <p className="columnEmpty">
              {totalCount > 0 ? "조건에 맞는 작업이 없어요." : "작업이 없어요. 아래에서 추가하거나 카드를 끌어다 놓으세요."}
            </p>
          )}

          <div
            ref={endZoneRef}
            className="columnEndZone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              onColumnEndDragEnter?.();
            }}
          />
        </div>

        {adding ? (
          <form className="columnAddForm" ref={addFormRef} onSubmit={submitNew}>
            <input
              autoFocus
              aria-label="새 작업 이름"
              placeholder="작업 이름을 입력하고 Enter"
              value={newTitle}
              maxLength={200}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeNew();
              }}
            />
            <div className="columnAddForm__actions">
              <button type="submit" disabled={!newTitle.trim() || submitting}>
                추가
              </button>
              <button type="button" onClick={closeNew}>
                취소
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="columnAddTask" onClick={() => setAdding(true)}>
            <Plus size={15} />
            작업 추가
          </button>
        )}
      </article>

      {editOpen && (
        <StatusModal
          mode="edit"
          status={status}
          statuses={statuses}
          onClose={() => {
            setEditOpen(false);
            restoreMenuFocus();
          }}
          onSave={(data) => {
            onStatusSave?.(data);
            setEditOpen(false);
            restoreMenuFocus();
          }}
        />
      )}

      {deleteOpen && (
        <DeleteStatusModal
          status={status}
          statuses={statuses}
          onClose={() => {
            setDeleteOpen(false);
            restoreMenuFocus();
          }}
          onDelete={(data) => {
            onStatusDelete?.(data);
            setDeleteOpen(false);
          }}
        />
      )}
    </>
  );
}
