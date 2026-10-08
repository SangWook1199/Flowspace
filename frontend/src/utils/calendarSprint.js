import { pickCurrentSprint } from "./sprintRange";

// 스프린트의 "상태"(서버 값)별 표시 정보예요. 날짜가 겹치는 스프린트가 있어도 진행 중/계획됨/완료됨이 헷갈리지 않게,
// 날짜가 아니라 서버가 내려준 status로 나눠요.
export const SPRINT_STATUS = {
  ACTIVE: { key: "ACTIVE", label: "진행 중", color: "#16A34A" },
  PLANNING: { key: "PLANNING", label: "계획됨", color: "#2F6FED" },
  COMPLETED: { key: "COMPLETED", label: "완료됨", color: "#8C959F" },
};

export const SPRINT_STATUS_ORDER = ["ACTIVE", "PLANNING", "COMPLETED"];

// 백로그는 기간이 없어서 달력에서 고를 스프린트가 아니에요.
export const isCalendarSprint = (sprint) => sprint?.id !== "backlog" && sprint?.status !== "BACKLOG";

// 진행 중은 시작이 빠른 순, 계획됨은 곧 시작하는 순, 완료됨은 최근에 끝난 순으로 보여줘요.
const compareInGroup = {
  ACTIVE: (a, b) => String(a.startDate).localeCompare(String(b.startDate)),
  PLANNING: (a, b) => String(a.startDate).localeCompare(String(b.startDate)),
  COMPLETED: (a, b) => String(b.endDate).localeCompare(String(a.endDate)),
};

// [{...SPRINT_STATUS[status], items: []}] — 비어 있는 그룹은 빼요.
export const groupSprintsByStatus = (sprints) =>
  SPRINT_STATUS_ORDER.map((status) => ({
    ...SPRINT_STATUS[status],
    items: (sprints || []).filter((s) => isCalendarSprint(s) && s.status === status).sort(compareInGroup[status]),
  })).filter((group) => group.items.length > 0);

// 처음에 보여줄 스프린트: 진행 중인 것 중 오늘이 기간에 든 것 → 진행 중 첫 번째 → 계획됨/완료됨(기존 규칙) → 첫 번째.
export const pickInitialSprint = (sprints, today) => {
  const list = (sprints || []).filter(isCalendarSprint);
  const active = list.filter((s) => s.status === "ACTIVE");

  return (
    pickCurrentSprint(active, today) ?? active[0] ?? pickCurrentSprint(list, today) ?? list[0] ?? null
  );
};
