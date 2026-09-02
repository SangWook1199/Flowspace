export default function KanbanToolbar({ sprint, onSprintChange }) {
  return (
    <section className="kanban-toolbar">
      <div className="kanban-toolbar__left">
        <h1>칸반 보드</h1>
        <p>현재 진행 중인 스프린트의 작업을 관리합니다.</p>
      </div>

      <div className="kanban-toolbar__right">
        <select
          value={sprint}
          onChange={(e) => onSprintChange(e.target.value)}
          className="kanban-select"
        >
          <option>Sprint 1</option>
          <option>Sprint 2</option>
        </select>

        <button className="kanban-filter">담당자</button>
        <button className="kanban-filter">우선순위</button>
      </div>
    </section>
  );
}
