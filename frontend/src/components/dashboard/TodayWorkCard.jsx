import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/classes";
import { getAvatarTone } from "../../utils/avatarColor";

// 탭 정의: key가 task.status 값이에요(null이면 전체). 개수는 tasks에서 세서 탭 이름 옆에 붙여요.
const FILTERS = [
  { key: "all", label: "전체", status: null },
  { key: "todo", label: "해야 할 일", status: "todo" },
  { key: "progress", label: "진행 중", status: "progress" },
  { key: "done", label: "완료", status: "done" },
];

export default function TodayWorkCard({ tasks = [] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  // 탭에 적힌 숫자를 직접 적으면 작업이 바뀌어도 그대로라서, 항상 tasks에서 세요.
  const countOf = (status) =>
    status ? tasks.filter((task) => task.status === status).length : tasks.length;

  const activeStatus = FILTERS.find((f) => f.key === filter)?.status ?? null;
  const visibleTasks = activeStatus
    ? tasks.filter((task) => task.status === activeStatus)
    : tasks;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>오늘의 작업</h2>
        <button type="button" className={styles.more} onClick={() => navigate("/kanban")}>
          전체 보기
        </button>
      </div>

      <div className={styles.taskFilter}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? styles.active : undefined}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} {countOf(f.status)}
          </button>
        ))}
      </div>

      <table className={styles.taskTable}>
        <thead>
          <tr>
            <th width="28"></th>
            <th>우선순위</th>
            <th>작업 제목</th>
            <th>상태</th>
            <th>담당</th>
            <th>마감</th>
            <th width="40"></th>
          </tr>
        </thead>

        <tbody>
          {visibleTasks.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}
              >
                해당하는 작업이 없어요.
              </td>
            </tr>
          )}

          {visibleTasks.map((task) => (
            <tr key={task.id}>
              <td>
                <input
                  type="checkbox"
                  checked={task.done}
                  readOnly
                  aria-label={`${task.title} 완료 여부`}
                />
              </td>

              <td>
                <span
                  className={`${styles.priority} ${
                    styles[(task.priority || "").toLowerCase()]
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
                  {(task.assignees ?? []).map((user) => (
                    <span
                      key={user.id}
                      className={`${styles.assignee} ${styles[getAvatarTone(user.id)]}`}
                    >
                      {user.initial}
                    </span>
                  ))}
                </div>
              </td>

              <td>{task.time}</td>

              {/* 메뉴 버튼은 기능이 없어서 뺐어요(칸 자리는 그대로 둬요). */}
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
