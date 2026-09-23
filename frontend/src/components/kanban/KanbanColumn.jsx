import { useState, useRef, useEffect } from "react";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";

import TaskCard from "./TaskCard";
import StatusModal from "./StatusModal";
import DeleteStatusModal from "./DeleteStatusModal";

import { statuses } from "../../mock/kanban";

export default function KanbanColumn({
  status,
  tasks,
  isDragging = false,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragEnd,
}) {
  const [menu, setMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const menuRef = useRef(null);
  const columnRef = useRef(null);

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
            중 보여줄 이미지를 컬럼 전체(columnRef)로 바꿔줬어요 — 실제
            드래그 가능한 영역은 헤더 그대로고, 커서를 따라다니는
            "그림자"만 카드까지 포함한 전체 컬럼으로 보이는 거예요. */}
        <header
          className="columnHeader"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";

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
          onDragEnter={(e) => {
            e.preventDefault();
            onColumnDragEnter?.();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onDragEnd={() => onColumnDragEnd?.()}
        >
          <div className="columnTitle">
            <GripVertical size={14} className="columnGrip" />
            <i className={`columnDot ${status.color.toLowerCase()}`} />
            <h3>{status.name}</h3>
            <span>{tasks.length}</span>
          </div>

          <div className="columnMenuWrap" ref={menuRef}>
            <button
              className="columnMenu"
              onClick={() => setMenu((prev) => !prev)}
            >
              <MoreHorizontal size={18} />
            </button>

            {menu && (
              <div className="columnDropdown">
                <button
                  onClick={() => {
                    setEditOpen(true);
                    setMenu(false);
                  }}
                >
                  상태 수정
                </button>

                {!status.isDefault && (
                  <button
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

        <div className="columnBody">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
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
          onClose={() => setEditOpen(false)}
          onSave={(data) => {
            console.log("수정", data);
            setEditOpen(false);
          }}
        />
      )}

      {deleteOpen && (
        <DeleteStatusModal
          status={status}
          statuses={statuses}
          onClose={() => setDeleteOpen(false)}
          onDelete={(data) => {
            console.log("삭제", data);
            setDeleteOpen(false);
          }}
        />
      )}
    </>
  );
}
