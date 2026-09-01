import KanbanColumn from "./KanbanColumn";

export default function KanbanSnapshot({ kanban }) {
  return (
    <section className="retro-section">
      <div className="retro-section__header">
        <h2>칸반 스냅샷</h2>
        <p>스프린트 완료 시점의 칸반 상태입니다. (읽기 전용)</p>
      </div>

      <div className="retro-kanban">
        <KanbanColumn title="할 일" color="todo" tasks={kanban.todo} />

        <KanbanColumn title="진행 중" color="doing" tasks={kanban.doing} />

        <KanbanColumn title="완료" color="done" tasks={kanban.done} />
      </div>
    </section>
  );
}
