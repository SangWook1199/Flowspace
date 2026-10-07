import { diffDays, todayKey } from "../../utils/date";
import { htmlToText } from "../../utils/sanitizeHtml";

// 마감일까지 남은 일수를 카드용 표시로 바꿔요. 마감일이 없거나 잘못된 값이면 null이에요.
// tone: "late"(지난 작업) | "soon"(오늘~2일 뒤) | "normal"
export function dueInfo(dueDate, today = todayKey()) {
  const days = diffDays(today, dueDate);
  if (days === null) return null;
  if (days === 0) return { label: "D-Day", tone: "soon", days };
  if (days > 0) return { label: `D-${days}`, tone: days <= 2 ? "soon" : "normal", days };
  return { label: `D+${-days}`, tone: "late", days };
}

/* ---------- 필터 ---------- */

export const EMPTY_FILTERS = {
  query: "", // 제목·번호·설명·담당자 이름 검색
  assignees: [], // 담당자 id 목록("me"는 나, "none"은 미배정)
  priorities: [], // HIGH | MEDIUM | LOW
  dues: [], // overdue | today | week | later | none
  subtasks: [], // none | open | done
  statuses: [], // 보여줄 컬럼(상태) id 목록 — 비어 있으면 전체
};

export const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "높음" },
  { value: "MEDIUM", label: "보통" },
  { value: "LOW", label: "낮음" },
];

export const DUE_OPTIONS = [
  { value: "overdue", label: "마감 지남" },
  { value: "today", label: "오늘 마감" },
  { value: "week", label: "7일 이내 마감" },
  { value: "later", label: "그 이후 마감" },
  { value: "none", label: "마감일 없음" },
];

export const SUBTASK_OPTIONS = [
  { value: "none", label: "하위 작업 없음" },
  { value: "open", label: "미완료 하위 작업 있음" },
  { value: "done", label: "하위 작업 모두 완료" },
];

const FILTER_STORAGE_PREFIX = "flowspace.kanbanFilters.";

// 스프린트별로 마지막에 쓴 필터를 브라우저 탭에 기억해 둬요(작업을 열었다 돌아오거나 새로고침해도 그대로예요).
// 저장소를 못 쓰는 환경이면 조용히 건너뛰어요.
export function loadFilters(sprintId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(FILTER_STORAGE_PREFIX + sprintId) ?? "null");
    if (!saved || typeof saved !== "object") return EMPTY_FILTERS;
    const list = (value) => (Array.isArray(value) ? value : []);
    return {
      query: typeof saved.query === "string" ? saved.query : "",
      assignees: list(saved.assignees),
      priorities: list(saved.priorities),
      dues: list(saved.dues),
      subtasks: list(saved.subtasks),
      statuses: list(saved.statuses),
    };
  } catch {
    return EMPTY_FILTERS;
  }
}

export function saveFilters(sprintId, filters) {
  try {
    const empty = JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS);
    if (empty) sessionStorage.removeItem(FILTER_STORAGE_PREFIX + sprintId);
    else sessionStorage.setItem(FILTER_STORAGE_PREFIX + sprintId, JSON.stringify(filters));
  } catch {
    // 저장소를 못 쓰면 기억만 못 할 뿐이에요.
  }
}

// 값이 골라진 필터 항목(담당자·우선순위 …)의 수예요. 검색어는 세지 않아요.
export function countActiveFilters(filters) {
  return (
    (filters.assignees.length ? 1 : 0) +
    (filters.priorities.length ? 1 : 0) +
    (filters.dues.length ? 1 : 0) +
    (filters.subtasks.length ? 1 : 0) +
    (filters.statuses.length ? 1 : 0)
  );
}

const dueBucket = (task, today) => {
  if (!task.dueDate) return "none";
  const days = diffDays(today, task.dueDate);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return days <= 7 ? "week" : "later";
};

const subtaskBucket = (task) => {
  const list = task.subtasks ?? [];
  if (list.length === 0) return "none";
  return list.every((item) => item.checked) ? "done" : "open";
};

// 모든 조건을 동시에 만족하는 작업만 남겨요(조건 안의 여러 값은 "하나라도 맞으면"이에요).
export function matchesFilters(task, filters, { meId = null, today = todayKey() } = {}) {
  const assignees = task.assignees ?? [];

  if (filters.assignees.length) {
    const hit =
      assignees.length === 0
        ? filters.assignees.includes("none")
        : assignees.some(
            (user) => filters.assignees.includes(user?.id) || (meId != null && user?.id === meId && filters.assignees.includes("me")),
          );
    if (!hit) return false;
  }

  if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
  if (filters.dues.length && !filters.dues.includes(dueBucket(task, today))) return false;
  if (filters.subtasks.length && !filters.subtasks.includes(subtaskBucket(task))) return false;
  if (filters.statuses.length && !filters.statuses.includes(task.statusId)) return false;

  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = [
      task.title,
      task.code,
      htmlToText(task.description ?? ""),
      ...assignees.map((user) => user?.name),
      ...(task.subtasks ?? []).map((item) => item.text),
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}
