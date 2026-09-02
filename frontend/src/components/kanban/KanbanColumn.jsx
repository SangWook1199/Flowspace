import TaskCard from "./TaskCard";

export default function KanbanColumn({ title, color, tasks }) {
  return (
    <section className="kanban-column">
      <div className="kanban-column__header">
        <div className="kanban-column__title">
          <span className={`column-dot ${color}`}></span>
          <h3>{title}</h3>
        </div>

        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="kanban-column__body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      <button className="add-task">+ 작업 추가</button>
    </section>
  );
}
