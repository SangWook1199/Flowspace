const priorityLabel = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export default function KanbanTaskCard({ task }) {
  // 담당자가 아직 없는 작업(assignee가 null)도 있어서 [0]을 바로 읽으면 화면이 죽어요. 없으면 "?"/"미지정"으로 보여줘요.
  const assignee = task.assignee || "";
  const priority = (task.priority || "").toLowerCase();

  return (
    <article className="retro-task-card">
      <h4>{task.title}</h4>

      <div className="retro-task-card__footer">
        <div className="retro-assignee">
          <div className={`retro-avatar ${task.color ?? ""}`}>
            {assignee ? assignee[0] : "?"}
          </div>
          <span>{assignee || "미지정"}</span>
        </div>

        {priority && (
          <span className={`priority ${priority}`}>
            {priorityLabel[task.priority] ?? task.priority}
          </span>
        )}
      </div>
    </article>
  );
}
