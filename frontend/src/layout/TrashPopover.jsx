import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, Trash2, Undo2 } from "lucide-react";

// 사이드바 맨 아래, 설정 버튼 옆의 휴지통이에요. 아이콘만 보이고(개수 배지), 누르면 위로
// 팝업이 열려요. 노션 휴지통처럼 위에 검색창, 가운데에 (아이콘·제목·위치) 목록과 줄마다
// 복원/완전 삭제 버튼이 있어요. 확인창(confirm)과 실제 삭제는 부모(Sidebar)가 맡고,
// 여기선 열고 닫는 것과 검색·목록 표시만 해요.
// 복원은 멤버 모두 할 수 있지만, 되돌릴 수 없는 완전 삭제·비우기는 소유자(canManage)만 보여요.
// 서버도 같은 규칙으로 막아요. 휴지통에 30일 넘게 있던 페이지는 서버가 매일 자동으로 지워요.
const RETENTION_DAYS = 30;

// 휴지통 페이지의 위치("상위 / 상위")를 만들어요. 휴지통은 현재 워크스페이스 것만 보여주니
// 워크스페이스 이름은 안 붙이고, 최상위 페이지는 빈 문자열이라 위치 줄을 안 그려요.
const buildPath = (page, pagesById) => {
  const ancestors = [];
  const seen = new Set([page.id]);
  let parent = pagesById.get(page.parentPageId);
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    ancestors.unshift(parent.title || "제목 없음");
    parent = pagesById.get(parent.parentPageId);
  }
  return ancestors.join(" / ");
};

export default function TrashPopover({
  pages,
  allPages = [],
  canManage = false,
  onRestore,
  onPermanentlyDelete,
  onEmpty,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  // 바깥을 누르거나 Esc를 누르면 닫아요.
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((prev) => !prev);
    setQuery("");
  };

  const pagesById = useMemo(() => new Map(allPages.map((p) => [p.id, p])), [allPages]);

  const keyword = query.trim().toLowerCase();
  const visible = keyword
    ? pages.filter((p) => (p.title || "제목 없음").toLowerCase().includes(keyword))
    : pages;

  const count = pages.length;

  return (
    <div className="trashPopover" ref={rootRef}>
      <button
        type="button"
        className="trashPopover__btn"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="휴지통"
        aria-label={count > 0 ? `휴지통, 페이지 ${count}개` : "휴지통"}
      >
        <Trash2 size={18} />
        {count > 0 && <b className="trashPopover__badge">{count > 99 ? "99+" : count}</b>}
      </button>

      {open && (
        <div className="trashPopover__panel" role="dialog" aria-label="휴지통">
          <label className="trashPopover__search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="휴지통에서 페이지 검색"
              aria-label="휴지통에서 페이지 검색"
              autoFocus
            />
          </label>

          {visible.length === 0 ? (
            <p className="trashPopover__empty">
              {count === 0 ? "휴지통이 비어 있어요." : "검색 결과가 없어요."}
            </p>
          ) : (
            <div className="trashPopover__list">
              {visible.map((page) => {
                const path = buildPath(page, pagesById);
                return (
                <div key={page.id} className="trashRow">
                  <span className="trashRow__icon">
                    {page.icon ? <span>{page.icon}</span> : <FileText size={16} />}
                  </span>

                  <span className="trashRow__text">
                    <strong>{page.title || "제목 없음"}</strong>
                    {path && <small>{path}</small>}
                  </span>

                  <button
                    type="button"
                    className="trashRow__action"
                    onClick={() => onRestore(page.id)}
                    title="복원"
                    aria-label={`${page.title || "제목 없음"} 복원`}
                  >
                    <Undo2 size={15} />
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      className="trashRow__action trashRow__action--danger"
                      onClick={() => onPermanentlyDelete(page)}
                      title="완전히 삭제"
                      aria-label={`${page.title || "제목 없음"} 완전히 삭제`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}

          <div className="trashPopover__foot">
            <small>{`페이지는 휴지통에 ${RETENTION_DAYS}일 동안 보관 후 자동으로 삭제돼요.`}</small>
            {canManage && count > 0 && (
              <button type="button" className="trashSection__empty" onClick={onEmpty}>
                휴지통 비우기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
