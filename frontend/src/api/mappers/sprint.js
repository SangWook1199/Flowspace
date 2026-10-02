import { sprintColorToCss, sprintHexToColor } from "../../utils/color";

// 스프린트 상태에 따라 카드 아이콘 이름을 정해요(SprintCard의 SPRINT_ICONS 키와 같아요).
const ICON_BY_STATUS = {
  ACTIVE: "Flag",
  PLANNING: "CalendarDays",
  COMPLETED: "CircleCheck",
};

// 서버 SprintResponse → 화면 스프린트.
// - id: sprintId (백로그는 서버가 id를 null로 줘서 "backlog"로 바꿔요)
// - color: 카드/점 클래스로 쓰는 CSS 이름, colorCode: 서버 색 이름(WorkspaceColor)
// - total/completed/inProgress/todo는 작업 목록에서 세어 채워요(useSprintData). 여기선 서버 숫자만 넣어둬요.
export const toSprint = (dto) => {
  const isBacklog = Boolean(dto.isBacklog);

  return {
    id: isBacklog ? "backlog" : dto.sprintId,
    workspaceId: dto.workspaceId,
    createdBy: dto.createdBy ?? null,
    name: dto.name,
    goal: dto.goal ?? "",
    description: dto.description ?? "",
    color: sprintColorToCss(dto.color),
    colorCode: dto.color ?? "BLUE",
    startDate: dto.startDate ?? "",
    endDate: dto.endDate ?? "",
    status: dto.status ?? (isBacklog ? "BACKLOG" : "PLANNING"),
    icon: ICON_BY_STATUS[dto.status] ?? "Flag",
    createdAt: dto.createdAt ?? null,
    isBacklog,
    progress: dto.progress ?? 0,
    total: dto.taskCount ?? 0,
    completed: dto.completedTaskCount ?? 0,
    inProgress: 0,
    todo: 0,
  };
};

// 스프린트 만들기 화면(SprintForm)의 값 → 서버 요청.
// 색은 선택기가 #hex로 주니까 서버 색 이름으로 바꿔요. 설명은 비어 있으면 null이에요.
export const toSprintCreateRequest = (form) => ({
  name: form.name.trim(),
  goal: form.goal?.trim() || null,
  description: form.description?.trim() ? form.description : null,
  color: sprintHexToColor(form.color),
  startDate: form.startDate,
  endDate: form.endDate,
  status: form.status ?? "PLANNING",
});
