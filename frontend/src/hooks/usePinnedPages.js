import { useCallback, useMemo, useSyncExternalStore } from "react";

// 즐겨찾기한 페이지 id를 워크스페이스별로 이 브라우저에 기억해요(사이드바와 "모든 페이지" 화면이 같이 써요).
// 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 탭이 열려 있는 동안만 메모리에 기억해요.
const EVENT = "flowspace:pinned-pages";
const keyOf = (workspaceId) => `flowspace.pinnedPages.${workspaceId}`;
const memory = new Map();

const readRaw = (workspaceId) => {
  try {
    const saved = localStorage.getItem(keyOf(workspaceId));
    if (saved !== null) return saved;
  } catch {
    // 저장소를 못 읽어도 아래 메모리 값으로 동작해요.
  }
  return memory.get(workspaceId) ?? "[]";
};

const parse = (raw) => {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
};

const write = (workspaceId, ids) => {
  const raw = JSON.stringify(ids);
  memory.set(workspaceId, raw);

  try {
    localStorage.setItem(keyOf(workspaceId), raw);
  } catch {
    // 저장하지 못해도 메모리에는 남아 있어요.
  }

  window.dispatchEvent(new Event(EVENT));
};

const subscribe = (callback) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

// pinnedIds: 즐겨찾기한 순서대로의 id 배열, isPinned(id), togglePin(id)
export default function usePinnedPages(workspaceId) {
  const raw = useSyncExternalStore(
    subscribe,
    () => (workspaceId == null ? "[]" : readRaw(workspaceId)),
    () => "[]",
  );
  const pinnedIds = useMemo(() => parse(raw), [raw]);

  const isPinned = useCallback((id) => pinnedIds.includes(id), [pinnedIds]);

  const togglePin = useCallback(
    (id) => {
      if (workspaceId == null) return;
      const current = parse(readRaw(workspaceId));
      write(workspaceId, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },
    [workspaceId],
  );

  return { pinnedIds, isPinned, togglePin };
}
