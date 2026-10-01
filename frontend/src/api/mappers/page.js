import { fileUrl } from "../../utils/fileUrl";

// 서버 PageResponse → 화면 페이지.
// blocks는 페이지 상세(/pages/{id}/detail)에서 오는 값인데, 블록 저장 연결(M5) 전까지는
// 목록 응답에 없어서 빈 텍스트 블록 하나를 기본값으로 둬요.
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
  trashedAt: dto.deletedAt ?? null,
  blocks: [{ id: 1, type: "TEXT", content: "" }],
});

// 페이지 수정 요청. 서버는 parentPageId가 비면 최상위로 옮겨버려서 항상 현재 값을 같이 보내요.
export const toPageUpdateRequest = (page) => ({
  parentPageId: page.parentPageId ?? null,
  title: (page.title ?? "").trim() || "제목 없음",
  icon: page.icon ?? null,
});
