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

// 서버 WorkspaceMemberResponse → 헤더/담당자 목록의 팀원.
// 서버에는 접속 상태가 없어서 online은 "지금 로그인한 나"만 true예요.
export const toMember = (dto, currentUserId) => ({
  id: dto.userId,
  name: dto.nickname ?? dto.name,
  initial: getInitial(dto.nickname ?? dto.name),
  role: dto.role,
  profileImageUrl: fileUrl(dto.profileImageUrl),
  online: dto.userId === currentUserId,
});
