export default function SubtaskList({ subtasks = [] }) {
  return (
    <div className="subtask-list">
      {subtasks.map((subtask, index) => (
        <div key={subtask.id ?? `${subtask.text}-${index}`} className="subtask-item">
          {/* 여기(칸반 카드)는 미리보기라 읽기 전용이에요 — 실제로 체크는
              페이지 TASK 블록이나 스프린트 작업 목록에서 해요(같은
              sprintTasks 상태를 보니까 여기도 바로 반영돼요). */}
          <input type="checkbox" checked={Boolean(subtask.checked)} readOnly aria-label={subtask.text} />

          <span className={subtask.checked ? "done" : ""}>{subtask.text}</span>
        </div>
      ))}
    </div>
  );
}
