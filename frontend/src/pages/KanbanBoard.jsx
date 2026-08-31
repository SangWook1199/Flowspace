import { useState } from "react";
import KanbanColumn from "../components/kanban/KanbanColumn";
import styles from "../styles/kanban/kanban-board.module.css";

const initialTasks = [
  {
    id: "SP1-1",
    title: "JWT 로그인 API 구현",
    assignee: "상욱",
    priority: "HIGH",
    status: "TODO",
    subtasks: [
      { title: "JWT 토큰 발급", done: true },
      { title: "Refresh Token", done: true },
      { title: "로그인 API", done: true },
      { title: "Access Token", done: false },
      { title: "예외 처리", done: false },
    ],
  },
  {
    id: "SP1-2",
    title: "유저 알림 시스템",
    assignee: "민수",
    priority: "MEDIUM",
    status: "DOING",
    subtasks: [
      { title: "알림 저장", done: true },
      { title: "웹 푸시", done: true },
      { title: "읽음 처리", done: false },
      { title: "API", done: false },
    ],
  },
  {
    id: "SP1-6",
    title: "OAuth 연동",
    assignee: "상욱",
    priority: "HIGH",
    status: "DONE",
    subtasks: [
      { title: "Google", done: true },
      { title: "Kakao", done: true },
      { title: "Naver", done: true },
      { title: "Test", done: true },
    ],
  },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState(initialTasks);

  const moveTask = (id, nextStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: nextStatus } : task,
      ),
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>칸반 보드</h1>
          <p>현재 진행 중인 Sprint 1 작업</p>
        </div>

        <div className={styles.toolbar}>
          <button>Sprint 1</button>
          <button>담당자</button>
          <button>우선순위</button>
        </div>
      </div>

      <div className={styles.board}>
        <KanbanColumn
          title="할 일"
          status="TODO"
          color="#4F6EF7"
          tasks={tasks.filter((t) => t.status === "TODO")}
          onMove={moveTask}
        />

        <KanbanColumn
          title="진행 중"
          status="DOING"
          color="#F59E0B"
          tasks={tasks.filter((t) => t.status === "DOING")}
          onMove={moveTask}
        />

        <KanbanColumn
          title="완료"
          status="DONE"
          color="#22C55E"
          tasks={tasks.filter((t) => t.status === "DONE")}
          onMove={moveTask}
        />
      </div>
    </div>
  );
}
