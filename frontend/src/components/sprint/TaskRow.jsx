import { Fragment } from "react";
import { ChevronRight, Flag } from "lucide-react";
import UserAvatar from "./UserAvatar";
import styles from "./TaskWorkspace.module.css";
import { formatDateDots } from "../../utils/date";

const priorityColor = { 높음: "high", 보통: "medium", 낮음: "low" };
export default function TaskRow({
  task,
  checked,
  selected,
  open = false,
  sprintRange = null,
  onToggleOpen,
  onCheck,
  onSelect,
}) {
  const subtasks = task.subtasks ?? [];
  const assignees = task.assignees ?? [];
  const done = subtasks.filter((item) => item.checked).length;
  // 스프린트 기간 밖의 날짜는 주황색으로 표시해요(막지는 않아요).
  const outOfRange = (value) =>
    Boolean(sprintRange?.startDate && sprintRange?.endDate && value && (value < sprintRange.startDate || value > sprintRange.endDate));
  const dateClass = (value) => `${styles.dateCell}${outOfRange(value) ? ` ${styles.dateOut}` : ""}`;
  const dateTitle = (value) => (outOfRange(value) ? "스프린트 기간 밖의 날짜예요" : undefined);
  return (
    <Fragment>
    <tr
      className={selected ? styles.selected : ""}
      onClick={() => onSelect(task.id)}
      // 키보드로도 고를 수 있게 Tab으로 포커스하고 Enter/Space로 선택해요(안의 체크박스·버튼에서 난 키는 그쪽이 처리해요).
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(task.id);
        }
      }}
    >
      <td onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={`${styles.rowToggle} ${open ? styles.rowToggleOpen : ""}`}
          disabled={subtasks.length === 0}
          aria-expanded={open}
          aria-label={`${task.code ?? task.id} 세부 작업 ${open ? "접기" : "펼치기"}`}
          title={subtasks.length === 0 ? "세부 작업이 없어요" : open ? "세부 작업 접기" : "세부 작업 펼치기"}
          onClick={() => onToggleOpen?.(task.id)}
        >
          <ChevronRight size={16} />
        </button>
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          aria-label={`${task.code ?? task.id} 선택`}
          onChange={() => onCheck(task.id)}
        />
      </td>
      <td className={styles.taskCode}>{task.code ?? task.id}</td>
      <td className={styles.taskTitle} title={task.title}>
        {task.title}
      </td>
      <td>
        {assignees.length > 0 && (
          <span className={styles.assigneeCell} title={assignees.map((user) => user.name).join(", ")}>
            <span className={styles.avatarStack}>
              {assignees.slice(0, 3).map((user) => (
                <UserAvatar key={user.id} user={user} />
              ))}
            </span>
            <span className={styles.assigneeNames}>
              {assignees[0].name}
              {assignees.length > 1 && ` 외 ${assignees.length - 1}명`}
            </span>
          </span>
        )}
      </td>
      <td>
        <span
          className={`${styles.priority} ${styles[priorityColor[task.priority]]} ${styles[`${priorityColor[task.priority]}Bg`]}`}
        >
          <Flag size={14} />
          {task.priority}
        </span>
      </td>
      <td className={dateClass(task.startDate)} title={dateTitle(task.startDate)}>{formatDateDots(task.startDate) || "-"}</td>
      <td className={dateClass(task.dueDate)} title={dateTitle(task.dueDate)}>{formatDateDots(task.dueDate) || "-"}</td>
      <td>
        {subtasks.length === 0 ? (
          <span className={styles.dateCell}>-</span>
        ) : (
          <span className={styles.subCount}>
            <span>
              {done} / {subtasks.length}
            </span>
            <i>
              <b style={{ width: `${Math.round((done / subtasks.length) * 100)}%` }} />
            </i>
          </span>
        )}
      </td>
    </tr>
    {open &&
      subtasks.map((sub) => {
        const owner = assignees.find((user) => user.id === sub.assigneeId);
        return (
          <tr key={`sub-${sub.id}`} className={styles.subRow} onClick={() => onSelect(task.id)}>
            <td />
            <td />
            <td />
            <td className={`${styles.subTitle} ${sub.checked ? styles.subTitleDone : ""}`} title={sub.text}>
              <span>
                <em>{sub.text}</em>
              </span>
            </td>
            <td>
              {owner && (
                <span className={styles.assigneeCell} title={owner.name}>
                  <span className={styles.avatarStack}>
                    <UserAvatar user={owner} />
                  </span>
                  <span className={styles.assigneeNames}>{owner.name}</span>
                </span>
              )}
            </td>
            <td />
            <td />
            <td />
            <td>
              <span className={`${styles.subState} ${sub.checked ? styles.subStateDone : ""}`}>
                {sub.checked ? "완료" : "미완료"}
              </span>
            </td>
          </tr>
        );
      })}
    </Fragment>
  );
}
