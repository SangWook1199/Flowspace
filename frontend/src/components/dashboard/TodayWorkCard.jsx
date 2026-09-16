import { MoreVertical } from "lucide-react";
import styles from "../../styles/classes";

export default function TodayWorkCard({ tasks }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>오늘의 작업</h2>
        <button className={styles.more}>전체 보기</button>
      </div>

      <div className={styles.taskFilter}>
        <button className={styles.active}>전체 6</button>
        <button>해야 할 일 5</button>
        <button>진행 중 2</button>
        <button>완료 1</button>
      </div>

      <table className={styles.taskTable}>
        <thead>
          <tr>
            <th width="28"></th>
            <th>우선순위</th>
            <th>작업 제목</th>
            <th>상태</th>
            <th>담당</th>
            <th>시간</th>
            <th width="40"></th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <input type="checkbox" checked={task.done} readOnly />
              </td>

              <td>
                <span
                  className={`${styles.priority} ${
                    styles[task.priority.toLowerCase()]
                  }`}
                >
                  {task.priorityLabel}
                </span>
              </td>

              <td className={styles.taskTitle}>{task.title}</td>

              <td>
                <span
                  className={`${styles.statusBadge} ${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`]}`}
                >
                  {task.statusName}
                </span>
              </td>

              <td>
                <div className={styles.assigneeGroup}>
                  {task.assignees.map((user) => (
                    <span
                      key={user.initial}
                      className={`${styles.assignee} ${styles[user.tone]}`}
                    >
                      {user.initial}
                    </span>
                  ))}
                </div>
              </td>

              <td>{task.time}</td>

              <td>
                <button className={styles.moreIcon}>
                  <MoreVertical size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
