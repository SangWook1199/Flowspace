import KanbanTaskCard from "./KanbanTaskCard";

export default function KanbanColumn({ title, color, tasks }) {
  return (
    <div className={`retro-column ${color}`}>
      <div className="retro-column__header">
        <div className="retro-column__title">
          <span className={`column-dot ${color}`} />
          <h3>{title}</h3>
        </div>

        <span className="retro-column__count">{tasks.length}</span>
      </div>

      <div className="retro-column__body">
        {tasks.length === 0 ? (
          <div className="retro-column__empty">
            <p>태스크가 없습니다.</p>
          </div>
        ) : (
          tasks.map((task) => <KanbanTaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
