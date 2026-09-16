import { useState } from "react";
import { Plus } from "lucide-react";

import KanbanColumn from "../components/kanban/KanbanColumn";
import StatusModal from "../components/kanban/StatusModal";

import { activeSprint, statuses, kanbanTasks } from "../mock/kanban";

export default function Kanban() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="kanbanPage">
      <header className="kanbanHeader">
        <div>
          <h1>칸반 보드</h1>
          <p>{activeSprint.name} · 현재 활성 스프린트</p>
        </div>

        <button className="addStatusBtn" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />새 상태 컬럼
        </button>
      </header>

      <section className="kanbanBoard">
        {statuses
          .sort((a, b) => a.position - b.position)
          .map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={kanbanTasks.filter((task) => task.statusId === status.id)}
            />
          ))}
      </section>

      {createOpen && (
        <StatusModal mode="create" onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
