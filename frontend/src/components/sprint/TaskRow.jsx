import { Flag, MoreHorizontal } from "lucide-react";
import styles from "./TaskWorkspace.module.css";
import { formatDateDots } from "../../utils/date";

const priorityColor = { 높음: "high", 보통: "medium", 낮음: "low" };
export default function TaskRow({
  task,
  checked,
  selected,
  onCheck,
  onSelect,
}) {
  const subtasks = task.subtasks ?? [];
  const done = subtasks.filter((item) => item.checked).length;
  return (
    <tr
      className={selected ? styles.selected : ""}
      onClick={() => onSelect(task.id)}
    >
      <td onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          aria-label={`${task.id} 선택`}
          onChange={() => onCheck(task.id)}
        />
      </td>
      <td>{task.id}</td>
      <td className={styles.taskTitle}>{task.title}</td>
      <td>
        <span className={styles.avatar}>{task.assignee?.[0]}</span>
        {task.assignee}
      </td>
      <td>
        <span
          className={`${styles.priority} ${styles[priorityColor[task.priority]]}`}
        >
          <Flag size={14} />
          {task.priority}
        </span>
      </td>
      <td>{formatDateDots(task.startDate)}</td>
      <td>{formatDateDots(task.dueDate)}</td>
      <td>
        {done} / {subtasks.length}
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.more} aria-label="작업 메뉴">
          <MoreHorizontal size={19} />
        </button>
      </td>
    </tr>
  );
}
