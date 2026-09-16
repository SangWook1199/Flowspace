import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import TaskCard from "./TaskCard";
import StatusModal from "./StatusModal";
import DeleteStatusModal from "./DeleteStatusModal";

import { statuses } from "../../mock/kanban";

export default function KanbanColumn({ status, tasks }) {
  const [menu, setMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const menuRef = useRef(null);

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
      <article className="kanbanColumn">
        <header className="columnHeader">
          <div className="columnTitle">
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
