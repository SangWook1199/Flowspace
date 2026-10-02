import { workspaceColorToHex, workspaceHexToColor } from "../../utils/color";
import { fileUrl } from "../../utils/fileUrl";
import { getInitial } from "../../utils/initial";

// 서버 WorkspaceResponse → 화면 워크스페이스. color는 #hex로 바꿔요(서버는 BLUE 같은 이름).
export const toWorkspace = (dto) => ({
  id: dto.workspaceId,
  name: dto.name,
  initials: dto.initials,
  color: workspaceColorToHex(dto.color),
  // 이모지 아이콘(없으면 ""). 비어 있으면 화면이 이니셜을 보여줘요.
  icon: dto.icon ?? "",
  ownerId: dto.ownerId,
  role: dto.role,
});

// 워크스페이스 만들기·수정 폼 → 서버 요청. 아이콘을 비우면 null(아이콘 없음)이에요.
export const toWorkspaceRequest = ({ name, initials, color, icon }) => ({
  name: name.trim(),
  initials,
  color: workspaceHexToColor(color),
  icon: icon?.trim() || null,
});

// 서버 MemberProfileResponse → 프로필 카드용. 담당 작업은 최대 5개만 와요(openTaskCount는 전체 개수).
export const toMemberProfile = (dto) => ({
  id: dto.userId,
  name: dto.nickname,
  initial: getInitial(dto.nickname),
  email: dto.email,
  bio: dto.bio ?? "",
  profileImageUrl: fileUrl(dto.profileImageUrl),
  role: dto.role,
  joinedAt: dto.joinedAt ?? null,
  online: Boolean(dto.online),
  lastActiveAt: dto.lastActiveAt ?? null,
  openTaskCount: dto.openTaskCount ?? 0,
  doneTaskCount: dto.doneTaskCount ?? 0,
  tasks: (dto.tasks ?? []).map((task) => ({
    id: task.taskId,
    title: task.title,
    endDate: task.endDate ?? null,
    priority: task.priority,
    statusName: task.statusName,
    link: task.link,
  })),
});

// 서버 WorkspaceMemberResponse → 헤더/담당자 목록의 팀원.
// online은 서버가 알려주는 접속 상태(WebSocket 연결 여부)예요. 지금 이 화면을 보는 나는 항상 온라인이에요.
export const toMember = (dto, currentUserId) => ({
  id: dto.userId,
  name: dto.nickname ?? dto.name,
  initial: getInitial(dto.nickname ?? dto.name),
  role: dto.role,
  profileImageUrl: fileUrl(dto.profileImageUrl),
  online: dto.userId === currentUserId || Boolean(dto.online),
  // 마지막으로 접속해 있던 시각(서버가 시간대 없는 LocalDateTime으로 줘요). 접속 기록이 없으면 null.
  lastActiveAt: dto.lastActiveAt ?? null,
});
