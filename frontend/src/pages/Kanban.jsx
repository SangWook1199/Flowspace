import { useState } from "react";
import { Plus } from "lucide-react";

import KanbanColumn from "../components/kanban/KanbanColumn";
import StatusModal from "../components/kanban/StatusModal";

import { activeSprint, statuses as statusesMock, kanbanTasks } from "../mock/kanban";

export default function Kanban() {
  const [createOpen, setCreateOpen] = useState(false);

  // 컬럼(상태) 순서는 이제 mock을 바로 쓰지 않고 state로 들고 있어요 —
  // 드래그로 순서를 바꾸면 이 배열 자체가 바뀌어야 화면에 반영되니까요.
  // 아직 로그인/API 연동 전이라 실제로는 프론트에서만 순서가 바뀌고
  // 새로고침하면 원래대로 돌아가요. 나중에 API가 붙으면 여기서
  // PATCH /api/task-statuses/reorder 에 { workspaceId, statuses: [{statusId,
  // position}] } 를 지금 순서 그대로(0,1,2...) 보내면 돼요 — status의
  // position은 백엔드에서도 그냥 정수라 배열 인덱스를 그대로 쓰면 됩니다.
  const [statuses, setStatuses] = useState(() =>
    [...statusesMock].sort((a, b) => a.position - b.position),
  );
  const [dragStatusId, setDragStatusId] = useState(null);

  const moveColumn = (targetId) => {
    if (dragStatusId === null || dragStatusId === targetId) return;

    setStatuses((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((s) => s.id === dragStatusId);
      const toIndex = next.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      return next.map((status, index) => ({ ...status, position: index }));
    });
  };

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
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={kanbanTasks.filter((task) => task.statusId === status.id)}
            isDragging={status.id === dragStatusId}
            onColumnDragStart={() => setDragStatusId(status.id)}
            onColumnDragEnter={() => moveColumn(status.id)}
            onColumnDragEnd={() => setDragStatusId(null)}
          />
        ))}
      </section>

      {createOpen && (
        <StatusModal mode="create" onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
