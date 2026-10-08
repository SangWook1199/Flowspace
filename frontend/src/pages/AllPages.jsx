import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileText, Search, Star } from "lucide-react";

import usePinnedPages from "../hooks/usePinnedPages";
import "../styles/allPages.css";

const TABS = [
  { key: "all", label: "전체" },
  { key: "normal", label: "일반" },
  { key: "retro", label: "회고" },
  { key: "pinned", label: "즐겨찾기" },
];

const SORTS = [
  { key: "updated", label: "최근 수정순" },
  { key: "title", label: "이름순" },
  { key: "created", label: "만든 순(최신)" },
];

const compareTitle = (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ko");

const COMPARE = {
  updated: (a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) || compareTitle(a, b),
  title: compareTitle,
  created: (a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) || compareTitle(a, b),
};

// "방금 전 / N분 전 / N시간 전 / N일 전", 일주일이 넘으면 날짜로 보여줘요.
const formatUpdated = (value, now) => {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return "";

  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  const date = new Date(time);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

// 페이지가 놓인 위치("상위 / 상위")예요. 최상위 페이지는 빈 문자열이에요.
const buildPath = (page, byId) => {
  const names = [];
  const seen = new Set([page.id]);
  let parent = byId.get(page.parentPageId);

  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    names.unshift(parent.title || "제목 없음");
    parent = byId.get(parent.parentPageId);
  }

  return names.join(" / ");
};

// 워크스페이스의 모든 페이지를 한곳에서 찾는 화면이에요. 사이드바에는 일부만 보여서, 나머지는 여기서 검색·정렬해서 열어요.
export default function AllPages() {
  const navigate = useNavigate();
  const { workspaceId, pagesInWorkspace, pagesLoading, pagesError, reloadPages } = useOutletContext();
  const { pinnedIds, isPinned, togglePin } = usePinnedPages(workspaceId);

  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("updated");
  const [keyword, setKeyword] = useState("");
  // "N분 전" 계산에 쓰는 지금 시각이에요. 화면을 열 때 한 번만 정해요.
  const [now] = useState(() => Date.now());

  const pages = useMemo(() => pagesInWorkspace.filter((page) => !page.trashedAt), [pagesInWorkspace]);
  const byId = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

  const counts = {
    all: pages.length,
    normal: pages.filter((page) => !page.isRetrospective).length,
    retro: pages.filter((page) => page.isRetrospective).length,
    pinned: pages.filter((page) => pinnedIds.includes(page.id)).length,
  };

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    const matchTab = (page) =>
      tab === "all" ||
      (tab === "normal" && !page.isRetrospective) ||
      (tab === "retro" && page.isRetrospective) ||
      (tab === "pinned" && pinnedIds.includes(page.id));

    return pages
      .filter(matchTab)
      .filter((page) => !text || String(page.title || "제목 없음").toLowerCase().includes(text))
      .map((page) => ({ page, path: buildPath(page, byId) }))
      .sort((a, b) => COMPARE[sort](a.page, b.page));
  }, [pages, byId, tab, pinnedIds, keyword, sort]);

  return (
    <div className="allPages">
      <header className="allPagesHead">
        <h1>모든 페이지</h1>
        <p>워크스페이스의 페이지를 한곳에서 찾아요. 별표로 즐겨찾기하면 사이드바 위쪽에 모여요.</p>
      </header>

      <div className="allPagesBar">
        <div className="allPagesTabs" role="tablist" aria-label="페이지 종류">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "active" : ""}
              onClick={() => setTab(item.key)}
            >
              {item.label} <b>{counts[item.key]}</b>
            </button>
          ))}
        </div>

        <div className="allPagesTools">
          <label className="allPagesSearch">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="페이지 제목 검색"
              aria-label="페이지 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>

          <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {pagesLoading ? (
        <p className="allPagesEmpty" role="status">
          페이지를 불러오는 중이에요…
        </p>
      ) : pagesError ? (
        <div className="allPagesEmpty" role="alert">
          <p>{pagesError}</p>
          <button type="button" onClick={reloadPages}>
            다시 시도
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="allPagesEmpty">
          {pages.length === 0
            ? "아직 페이지가 없어요. 사이드바에서 새 페이지를 만들어 보세요."
            : tab === "pinned" && !keyword.trim()
              ? "즐겨찾기한 페이지가 없어요. 페이지 줄의 별표를 눌러 추가해 보세요."
              : "조건에 맞는 페이지가 없어요."}
        </p>
      ) : (
        <ul className="allPagesList">
          {rows.map(({ page, path }) => {
            const pinned = isPinned(page.id);

            return (
              <li key={page.id}>
                <button type="button" className="allPagesRow" onClick={() => navigate(`/pages/${page.id}`)}>
                  <span className="allPagesIcon">{page.icon || <FileText size={16} />}</span>

                  <span className="allPagesName">
                    <b>{page.title || "제목 없음"}</b>
                    {path && <small>{path}</small>}
                  </span>

                  {page.isRetrospective && <em className="allPagesBadge">회고</em>}

                  <time className="allPagesTime" dateTime={page.updatedAt ?? undefined}>
                    {formatUpdated(page.updatedAt, now)}
                  </time>
                </button>

                {Number(page.id) > 0 && (
                  <button
                    type="button"
                    className={`allPagesStar${pinned ? " on" : ""}`}
                    aria-pressed={pinned}
                    aria-label={`${page.title || "제목 없음"} ${pinned ? "즐겨찾기 해제" : "즐겨찾기"}`}
                    title={pinned ? "즐겨찾기 해제" : "즐겨찾기"}
                    onClick={() => togglePin(page.id)}
                  >
                    <Star size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
