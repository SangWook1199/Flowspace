const priorityLabel = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export default function KanbanTaskCard({ task }) {
  return (
    <article className="retro-task-card">
      <h4>{task.title}</h4>

      <div className="retro-task-card__footer">
        <div className="retro-assignee">
          <div className={`retro-avatar ${task.color}`}>{task.assignee[0]}</div>
          <span>{task.assignee}</span>
        </div>

        <span className={`priority ${task.priority.toLowerCase()}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>
    </article>
  );
}
