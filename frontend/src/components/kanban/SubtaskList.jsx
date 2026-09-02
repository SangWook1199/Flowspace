export default function SubtaskList({ subtasks }) {
  return (
    <div className="subtask-list">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="subtask-item">
          <input type="checkbox" checked={subtask.done} readOnly />

          <span className={subtask.done ? "done" : ""}>{subtask.title}</span>
        </div>
      ))}
    </div>
  );
}
