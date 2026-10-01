import { useState, useRef, useEffect, Fragment } from "react";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";

import TaskCard from "./TaskCard";
import StatusModal from "./StatusModal";
import DeleteStatusModal from "./DeleteStatusModal";
import { KANBAN_DRAG_MIME } from "./kanbanDrag";

// statuses(보드의 전체 상태 목록)와 onStatusSave/onStatusDelete는 부모(Kanban 페이지)가 내려줘요 —
// 이 컴포넌트가 mock을 직접 읽으면 API로 바꿀 때 컬럼마다 손봐야 해서, 데이터는 전부 props로만 받아요.
// onColumnDragEnd/onTaskDragEnd(cancelled)의 cancelled는 Esc나 보드 밖 드롭으로 취소됐다는 뜻이에요.
export default function KanbanColumn({
  status,
  statuses = [],
  onStatusSave,
  onStatusDelete,
  tasks,
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
}) {
  const [menu, setMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  return (
    <>
      <article className={`kanbanColumn ${isDragging ? "dragging" : ""}`} ref={columnRef}>
        {/* 컬럼 순서 바꾸기는 헤더를 드래그해서 옮겨요(HTML5 드래그 앤
            드롭, 별도 라이브러리 없이 구현). draggable은 헤더에만
            걸려있어서 "..." 메뉴나 카드 버튼 클릭은 그대로 동작하는데,
            기본값이면 드래그할 때 헤더만 둥둥 떠서 하위 작업 카드들이
            안 보이는 게 어색해서, dragstart에서 setDragImage로 드래그
            중 보여줄 이미지를 컬럼 전체(columnRef)로 바꿔줬어요.

            예전엔 헤더에 "들어오면"(dragenter) 무조건 "이 컬럼 앞"으로만
            판단했는데, 그러면 뒤쪽에 놓고 싶어도 항상 앞으로만 잡혔어요.
            그래서 dragover(커서가 헤더 위에서 움직일 때마다 계속
            불려요)로 커서가 헤더 너비의 2/3 지점을 넘었는지 계산해서
            앞/뒤를 부모(Kanban.jsx)에 알려주면, 부모의
            handleColumnDragOver가 실제 대상 컬럼(앞/뒤)을 계산해요. */}
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
            <span>{tasks.length}</span>
          </div>

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

                {!status.isDefault && (
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

        {/* 카드도 컬럼과 같은 방식이에요 — 카드 위에서 dragover가 계속
            들어오면서(TaskCard 내부에서) 커서가 카드 높이의 2/3 지점을
            넘었는지를 계산해 "이 카드 앞"/"이 카드 뒤"를 여기로 알려주고
            (onDragOverCard), 그대로 부모(onTaskDragOver)에 전달해요.
            실제 배열은 드롭할 때 한 번만 바뀌어요(Kanban.jsx의 commitDrop
            주석 참고). 카드가 하나도 없는 빈 컬럼이거나 카드들 밑에
            순수하게 빈 공간이 남는 경우를 위해 마지막에 전용 영역
            (columnEndZone)을 따로 둬요 — 카드 사이의 좁은 gap 여백에서는
            반응하지 않아야 하기 때문에, columnBody 배경 자체의
            dragenter는 더 이상 쓰지 않아요. */}
        <div
          className="columnBody"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          {tasks.map((task) => (
            <Fragment key={task.id}>
              {dropTarget?.statusId === status.id &&
                dropTarget.beforeTaskId === task.id && (
                  <div className="dropIndicator" />
                )}

              <TaskCard
                task={task}
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

          <div
            className="columnEndZone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              onColumnEndDragEnter?.();
            }}
          />
        </div>

        <button className="columnAddTask">
          <Plus size={15} />
          작업 추가
        </button>
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
