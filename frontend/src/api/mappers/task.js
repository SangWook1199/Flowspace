import { fileUrl } from "../../utils/fileUrl";
import { getInitial } from "../../utils/initial";

// 서버 AssigneeItem → 화면 담당자 {id, name, initial}
export const toAssignee = (dto) => ({
  id: dto.userId,
  name: dto.name,
  initial: getInitial(dto.name),
  profileImageUrl: fileUrl(dto.profileImageUrl),
});

// 서버 SubTaskResponse → 화면 하위 작업 {id, text, checked, assigneeId}
// assigneeId는 하위 작업 담당자(작업 담당자 중 한 명)의 사용자 id예요(없으면 null).
export const toSubtask = (dto) => ({
  id: dto.subtaskId,
  text: dto.content,
  checked: Boolean(dto.isCompleted),
  assigneeId: dto.assigneeId ?? null,
  position: dto.position ?? 0,
});

// 서버 TaskResponse → 화면 작업.
// 서버의 endDate는 화면에서 dueDate(마감일)로 불러요. code는 화면에 보여주는 번호로, 워크스페이스 기준 작업 번호(taskNumber)예요.
export const toTask = (dto) => ({
  id: dto.taskId,
  code: `T-${dto.taskNumber ?? dto.taskId}`,
  workspaceId: dto.workspaceId,
  sprintId: dto.sprintId ?? null,
  statusId: dto.statusId,
  statusName: dto.statusName,
  position: Number(dto.position ?? 0),
  assignees: (dto.assignees ?? []).map(toAssignee),
  title: dto.title ?? "",
  description: dto.description ?? "",
  startDate: dto.startDate ?? "",
  dueDate: dto.endDate ?? "",
  priority: dto.priority ?? "MEDIUM",
  completedAt: dto.completedAt ?? null,
  createdAt: dto.createdAt ?? null,
  subtasks: (dto.subtasks ?? []).map(toSubtask),
  commentCount: (dto.comments ?? []).length,
});

// 작업 수정 요청. 서버는 항상 모든 값을 받아서(sprintId가 비면 백로그, 담당자 목록은 통째로 교체)
// 현재 작업 값을 전부 같이 보내요.
export const toTaskUpdateRequest = (task) => ({
  sprintId: task.sprintId ?? null,
  assigneeIds: (task.assignees ?? []).map((a) => a.id),
  statusId: task.statusId,
  title: (task.title ?? "").trim() || "제목 없음",
  description: task.description ?? "",
  startDate: task.startDate || null,
  endDate: task.dueDate || null,
  priority: task.priority,
});

// 작업 만들기 요청(스프린트 id는 주소에 들어가요).
export const toTaskCreateRequest = (draft) => ({
  assigneeIds: (draft.assignees ?? []).map((a) => a.id),
  statusId: draft.statusId,
  title: (draft.title ?? "").trim() || "새 작업",
  description: draft.description ?? "",
  startDate: draft.startDate || null,
  endDate: draft.dueDate || null,
  priority: draft.priority ?? "MEDIUM",
});

// 서버 TaskStatusResponse → 칸반 컬럼. 색(color)은 서버 이름(BLUE …) 그대로 두고 화면이 소문자로 바꿔 써요.
export const toStatus = (dto) => ({
  id: dto.statusId,
  name: dto.name,
  category: dto.category,
  color: dto.color,
  position: dto.position ?? 0,
  isDefault: Boolean(dto.isDefault),
  wipLimit: dto.wipLimit ?? null, // 작업 수 제한(WIP), 없으면 null
});
