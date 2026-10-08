// 달력의 작업을 늘어놓는 순서예요. 날짜 칸의 막대와 날짜 상세 패널이 같은 규칙을 써서 순서가 서로 같아요.
// 완료는 맨 아래, 그 위는 우선순위(높음→낮음) → 진행 중 먼저 → 마감 빠른 순 → 번호 순이에요.
const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_RANK = { IN_PROGRESS: 0, TODO: 1, DONE: 2 };
const rankOf = (table, key) => table[key] ?? 9;

export const compareDayTasks = (a, b) =>
  (a.status?.category === "DONE") - (b.status?.category === "DONE") ||
  rankOf(PRIORITY_RANK, a.priority) - rankOf(PRIORITY_RANK, b.priority) ||
  rankOf(STATUS_RANK, a.status?.category) - rankOf(STATUS_RANK, b.status?.category) ||
  String(a.end).localeCompare(String(b.end)) ||
  Number(a.id) - Number(b.id);
