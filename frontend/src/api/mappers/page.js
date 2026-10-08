import { fileUrl } from "../../utils/fileUrl";

// 서버 PageResponse → 화면 페이지.
// 블록(내용)은 페이지 상세(/pages/{id}/detail)에서 따로 받아요(api/blocks.js, hooks/usePageBlocks.js).
export const toPage = (dto) => ({
  id: dto.pageId,
  workspaceId: dto.workspaceId,
  parentPageId: dto.parentPageId ?? null,
  title: dto.title,
  icon: dto.icon ?? "📄",
  cover: fileUrl(dto.coverUrl),
  position: dto.position ?? 0,
  createdBy: dto.createdBy,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt ?? dto.createdAt ?? null,
  // 스프린트 회고에 연결된 페이지예요(스프린트마다 자동으로 생겨서 사이드바 목록에서는 따로 빼요).
  isRetrospective: Boolean(dto.retrospective),
  trashedAt: dto.deletedAt ?? null,
});

// 페이지 수정 요청. 서버는 parentPageId가 비면 최상위로 옮겨버려서 항상 현재 값을 같이 보내요.
export const toPageUpdateRequest = (page) => ({
  parentPageId: page.parentPageId ?? null,
  title: (page.title ?? "").trim() || "제목 없음",
  icon: page.icon ?? null,
});
