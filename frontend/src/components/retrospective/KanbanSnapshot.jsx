import KanbanColumn from "./KanbanColumn";

// 완료 시점의 상태 스냅샷마다 컬럼 하나씩 그려요(columns: [{ id, name, lane, tasks }]).
export default function KanbanSnapshot({ columns = [] }) {
  return (
    <section className="retro-section">
      <div className="retro-section__header">
        <h2>칸반 스냅샷</h2>
        <p>스프린트 완료 시점의 칸반 상태입니다. (읽기 전용)</p>
      </div>

      <div
        className="retro-kanban"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <KanbanColumn key={column.id} title={column.name} color={column.lane} tasks={column.tasks} />
        ))}
      </div>
    </section>
  );
}
