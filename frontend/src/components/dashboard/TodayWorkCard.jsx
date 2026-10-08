import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
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

// 한 줄에 보여줄 담당자 아이콘 수예요.
const MAX_ASSIGNEES = 4;

// 정렬 기준이에요. value(task)가 작을수록 앞이라서, 첫 번째 클릭(오름차순)이 아래 설명하는 순서가 돼요.
//  - 우선순위: 높음 → 보통 → 낮음 → 완료
//  - 상태: 진행 중 → 해야 할 일 → 완료
//  - 담당자: 담당자가 많은 순
//  - 마감일: 마감이 가까운(D-day가 적게 남은) 순, 마감일이 없으면 맨 아래
// 같은 열을 한 번 더 누르면 반대 순서가 돼요.
const PRIORITY_RANK = { high: 0, medium: 1, low: 2, done: 3 };
const STATUS_RANK = { progress: 0, todo: 1, done: 2 };

const SORTS = {
  priority: { label: "우선순위", value: (task) => PRIORITY_RANK[task.priority] ?? 9 },
  status: { label: "상태", value: (task) => STATUS_RANK[task.status] ?? 9 },
  assignees: { label: "담당자", value: (task) => -(task.assignees ?? []).length },
  due: { label: "마감일", value: (task) => task.dueDate || null },
};

const compareBy = (key, dir) => (a, b) => {
  const x = SORTS[key].value(a);
  const y = SORTS[key].value(b);

  // 값이 없는 작업(마감일 없음)은 방향과 상관없이 맨 아래로 보내요.
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;

  const result = x < y ? -1 : x > y ? 1 : 0;
  return dir === "asc" ? result : -result;
};

export default function TodayWorkCard({ tasks = [] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  // 처음에는 마감이 가까운 작업이 위에 오도록 마감일 순이에요.
  const [sort, setSort] = useState({ key: "due", dir: "asc" });

  // 탭에 적힌 숫자를 직접 적으면 작업이 바뀌어도 그대로라서, 항상 tasks에서 세요.
  const countOf = (status) =>
    status ? tasks.filter((task) => task.status === status).length : tasks.length;

  const activeStatus = FILTERS.find((f) => f.key === filter)?.status ?? null;

  // 탭(상태) → 검색(제목·담당자 이름) → 정렬 순으로 걸러요. sort는 안정 정렬이라 같은 값끼리는 원래 순서를 지켜요.
  const visibleTasks = useMemo(() => {
    const text = keyword.trim().toLowerCase();

    return tasks
      .filter((task) => !activeStatus || task.status === activeStatus)
      .filter(
        (task) =>
          !text ||
          String(task.title).toLowerCase().includes(text) ||
          (task.assignees ?? []).some((user) => String(user.name ?? "").toLowerCase().includes(text)),
      )
      .sort(compareBy(sort.key, sort.dir));
  }, [tasks, activeStatus, keyword, sort]);

  // 같은 열을 다시 누르면 방향을 뒤집고, 다른 열을 누르면 그 열의 첫 순서(오름차순)로 시작해요.
  const toggleSort = (key) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const sortHeader = (key) => {
    const active = sort.key === key;
    const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;

    return (
      <th aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          className={`${styles.sortBtn}${active ? ` ${styles.sortActive}` : ""}`}
          onClick={() => toggleSort(key)}
        >
          {SORTS[key].label}
          <Icon size={13} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>오늘의 작업</h2>
        <button type="button" className={styles.more} onClick={() => navigate("/kanban")}>
          전체 보기
        </button>
      </div>

      <div className={styles.taskToolbar}>
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

        <label className={styles.taskSearch}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            placeholder="제목·담당자 검색"
            aria-label="작업 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.panelScroll}>
      <table className={styles.taskTable}>
        <thead>
          <tr>
            {sortHeader("priority")}
            <th>작업 제목</th>
            {sortHeader("status")}
            {sortHeader("assignees")}
            {sortHeader("due")}
            <th width="40"></th>
          </tr>
        </thead>

        <tbody>
          {visibleTasks.length === 0 && (
            <tr>
              <td
                colSpan={6}
                style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}
              >
                {tasks.length === 0 ? "오늘 할 작업이 없어요." : "조건에 맞는 작업이 없어요."}
              </td>
            </tr>
          )}

          {visibleTasks.map((task) => (
            <tr key={task.id}>
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
                {/* 담당자 아이콘은 겹쳐서 보여주고, 많으면 앞의 몇 명만 보이고 나머지는 "+N"으로 줄여요. */}
                <div className={styles.assigneeGroup}>
                  {(task.assignees ?? []).slice(0, MAX_ASSIGNEES).map((user) => (
                    <span
                      key={user.id}
                      className={`${styles.assignee} ${styles[getAvatarTone(user.id)]}`}
                      title={user.name}
                    >
                      {user.initial}
                    </span>
                  ))}

                  {(task.assignees ?? []).length > MAX_ASSIGNEES && (
                    <span
                      className={styles.assigneeMore}
                      title={(task.assignees ?? [])
                        .slice(MAX_ASSIGNEES)
                        .map((user) => user.name)
                        .join(", ")}
                    >
                      +{(task.assignees ?? []).length - MAX_ASSIGNEES}
                    </span>
                  )}
                </div>
              </td>

              <td>{task.time}</td>

              {/* 메뉴 버튼은 기능이 없어서 뺐어요(칸 자리는 그대로 둬요). */}
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
