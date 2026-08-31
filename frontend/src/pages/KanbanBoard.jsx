import { useState } from "react";
import KanbanToolbar from "../components/kanban/KanbanToolbar";
import KanbanColumn from "../components/kanban/KanbanColumn";
import "../styles/kanban.css";

const initialTasks = [
  {
    id: "SP1-1",
    title: "JWT 로그인 API 구현",
    assignee: { name: "상욱", avatar: "상" },
    priority: "HIGH",
    status: "TODO",
    startDate: "08.28",
    endDate: "08.30",
    subtasks: [
      { id: 1, title: "JWT 토큰 발급", done: true },
      { id: 2, title: "Refresh Token", done: true },
      { id: 3, title: "로그인 API", done: true },
      { id: 4, title: "예외 처리", done: false },
      { id: 5, title: "테스트", done: false },
    ],
  },
  {
    id: "SP1-2",
    title: "블록 드래그 기능",
    assignee: { name: "민수", avatar: "민" },
    priority: "MEDIUM",
    status: "TODO",
    startDate: "08.29",
    endDate: "09.01",
    subtasks: [
      { id: 1, title: "Drag 시작", done: true },
      { id: 2, title: "Drop", done: false },
    ],
  },
  {
    id: "SP1-3",
    title: "Sprint UI 디자인",
    assignee: { name: "서연", avatar: "서" },
    priority: "MEDIUM",
    status: "DOING",
    startDate: "08.30",
    endDate: "09.02",
    subtasks: [
      { id: 1, title: "Hero", done: true },
      { id: 2, title: "Card", done: true },
      { id: 3, title: "Responsive", done: false },
    ],
  },
  {
    id: "SP1-4",
    title: "OAuth 연동",
    assignee: { name: "지민", avatar: "지" },
    priority: "HIGH",
    status: "DOING",
    startDate: "08.31",
    endDate: "09.03",
    subtasks: [
      { id: 1, title: "Google", done: true },
      { id: 2, title: "Kakao", done: false },
    ],
  },
  {
    id: "SP1-5",
    title: "파일 업로드",
    assignee: { name: "상욱", avatar: "상" },
    priority: "LOW",
    status: "DONE",
    startDate: "08.26",
    endDate: "08.28",
    subtasks: [
      { id: 1, title: "S3 연결", done: true },
      { id: 2, title: "API", done: true },
      { id: 3, title: "테스트", done: true },
    ],
  },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedSprint, setSelectedSprint] = useState("Sprint 1");

  const moveTask = (taskId, nextStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
    );
  };

  const todo = tasks.filter((task) => task.status === "TODO");
  const doing = tasks.filter((task) => task.status === "DOING");
  const done = tasks.filter((task) => task.status === "DONE");

  return (
    <div className="kanban-page">
      <KanbanToolbar
        sprint={selectedSprint}
        onSprintChange={setSelectedSprint}
      />

      <div className="kanban-board">
        <KanbanColumn title="할 일" color="blue" tasks={todo} />
        <KanbanColumn title="진행 중" color="orange" tasks={doing} />
        <KanbanColumn title="완료" color="green" tasks={done} />
      </div>
    </div>
  );
}
