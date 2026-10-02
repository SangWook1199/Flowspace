import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkspaceContext from "./WorkspaceContext";
import { useAuth } from "./useAuth";
import * as workspaceApi from "../api/workspaces";
import * as pageApi from "../api/pages";
import { getErrorMessage } from "../utils/apiError";
import { getSavedWorkspaceId, saveWorkspaceId } from "../utils/workspaceStorage";

import { useSprintData } from "./useSprintData";

// 사이드바 메뉴 목록은 아직 목데이터예요(대시보드 연결 M4에서 정리해요).
import { NAVIGATION } from "../utils/navigation";
// workspaceId가 없는 페이지(서버에 만드는 중인 임시 페이지 등)는 1번 워크스페이스 소속으로 봐요.
const DEFAULT_WORKSPACE_ID = 1;
const DEFAULT_CREATOR = "상욱"; // 로그인 정보가 없을 때만 쓰는 예전 기본값이에요.

// 페이지 제목·아이콘을 고칠 때 서버에 보내기까지 기다리는 시간(타이핑 중 요청 폭주 방지).
const PAGE_SAVE_DELAY_MS = 600;

const inWorkspace = (item, workspaceId) =>
  (item.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId;

// 서버에 있는 페이지는 양수 id예요. 서버에 만드는 동안 화면에 먼저 보여주는 임시 페이지는
// 음수 id를 써서 서로 섞이지 않게 해요(서버가 id를 주면 실제 id로 바뀌어요).
const isServerId = (id) => typeof id === "number" && id > 0;

// 삭제할 페이지 + 그 아래 모든 하위 페이지(재귀)의 id를 모아요.
// pages 테이블에 soft-delete용 컬럼이 있는 걸 감안하면 실제로는 하드
// 삭제 대신 deleted_at을 채우는 식이겠지만, 목데이터 단계라 배열에서
// 바로 걷어내는 걸로 대신해요.
function collectWithDescendants(pages, rootId) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of pages) {
      if (ids.has(p.parentPageId) && !ids.has(p.id)) {
        ids.add(p.id);
        changed = true;
      }
    }
  }
  return ids;
}

// 서버에서 새로 받은 페이지 목록을 현재 상태에 합쳐요.
// - 제목·아이콘을 고치는 중(저장 대기)인 페이지는 화면 값을 유지해요.
// - 서버에 만드는 중인 임시 페이지(음수 id)는 그대로 남겨요.
function mergeServerPages(prev, serverPages, workspaceId, dirtyIds) {
  const prevById = new Map(prev.map((p) => [p.id, p]));

  const merged = serverPages.map((page) => {
    const old = prevById.get(page.id);
    if (!old || !dirtyIds.has(page.id)) return page;
    return { ...page, title: old.title, icon: old.icon };
  });

  const locals = prev.filter((p) => !isServerId(p.id) && inWorkspace(p, workspaceId));
  return [...merged, ...locals];
}

// "홍길동", "Human EXE", "😀 팀" 같은 이름에서 이니셜을 뽑지 않고 쓰는 쪽(생성 화면)이
// 직접 만들어요 — 여기선 이니셜이 비어서 들어왔을 때의 안전망만 둬요.
// Array.from은 이모지(서로게이트 쌍)를 한 글자로 세어줘서 글자가 깨지지 않아요.
function fallbackInitials(name) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "H";
}

export function WorkspaceProvider({ children }) {
  // 로그인한 사람이 바뀌면(로그인·로그아웃·계정 전환) 워크스페이스·페이지 상태를 전부 비우고
  // 새로 불러와요. AuthProvider 안쪽에 마운트되지만, 혹시 밖에서 쓰여도 죽지 않게 옵셔널 체이닝으로 받아요.
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;
  const creatorName = auth?.user?.nickname || DEFAULT_CREATOR;

  /* ---------- 워크스페이스 ---------- */

  // 생성 화면(MainLayout 밖 라우트)과 사이드바가 같은 상태를 봐야 해서 라우트 위로 끌어올렸어요.
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [workspaceError, setWorkspaceError] = useState(null);

  // 오래된 응답이 새 상태를 덮어쓰지 않게 요청마다 번호를 매겨요.
  const workspaceRequestId = useRef(0);

  const loadWorkspaces = useCallback(async () => {
    const id = ++workspaceRequestId.current;
    setWorkspaceError(null);

    try {
      const list = await workspaceApi.getWorkspaces();
      if (id !== workspaceRequestId.current) return;

      if (list.length === 0) {
        setWorkspaceError("참여 중인 워크스페이스가 없어요.");
        return;
      }

      setWorkspaces(list);
      // 마지막으로 보던 워크스페이스가 있으면 거기서, 없으면 첫 번째에서 시작해요.
      setCurrentWorkspaceId((prev) => {
        if (prev != null && list.some((w) => w.id === prev)) return prev;
        const saved = getSavedWorkspaceId(userId);
        return list.some((w) => w.id === saved) ? saved : list[0].id;
      });
    } catch (err) {
      if (id === workspaceRequestId.current) setWorkspaceError(getErrorMessage(err));
    }
  }, [userId]);

  /* ---------- 페이지 · 팀원 ---------- */

  // 화면의 pages는 서버 목록에 "서버에 만드는 중인 임시 페이지"를 더한 값이에요(블록은 페이지 상세에서 따로 받아요).
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  // 어느 워크스페이스의 페이지까지 불러왔는지. 현재 워크스페이스와 다르면 "불러오는 중"이에요.
  const [pagesLoadedFor, setPagesLoadedFor] = useState(null);
  const [pagesError, setPagesError] = useState(null);

  const pagesRequestId = useRef(0);
  const pagesRef = useRef(pages);
  // 제목·아이콘 저장 대기 타이머(pageId → timeout id). 대기 중인 페이지는 서버 목록으로 덮어쓰지 않아요.
  const saveTimers = useRef(new Map());

  useEffect(() => {
    pagesRef.current = pages;
  });

  // silent: 화면을 "불러오는 중"으로 바꾸지 않고 조용히 서버 상태와 맞춰요(삭제·복원 뒤 등).
  const loadPages = useCallback(async (workspaceId, { silent = false } = {}) => {
    const id = ++pagesRequestId.current;
    if (!silent) setPagesError(null);

    try {
      // 휴지통 목록은 없어도 페이지는 쓸 수 있어서, 실패해도 페이지 목록 로딩은 막지 않아요.
      const [active, trashed] = await Promise.all([
        pageApi.getPages(workspaceId),
        pageApi.getTrashedPages(workspaceId).catch(() => null),
      ]);
      if (id !== pagesRequestId.current) return;

      // 조용한 새로고침에서 휴지통을 못 받았다면 "휴지통이 비었다"고 착각하지 않게 이번엔 건너뛰어요.
      if (trashed === null && silent) return;

      const dirtyIds = new Set(saveTimers.current.keys());
      setPages((prev) => mergeServerPages(prev, [...active, ...(trashed ?? [])], workspaceId, dirtyIds));
      setPagesLoadedFor(workspaceId);
    } catch (err) {
      if (id !== pagesRequestId.current) return;
      if (!silent) {
        setPagesError(getErrorMessage(err));
        setPagesLoadedFor(workspaceId);
      }
    }
  }, []);

  const membersRequestId = useRef(0);

  const loadMembers = useCallback(
    async (workspaceId) => {
      const id = ++membersRequestId.current;

      try {
        const list = await workspaceApi.getMembers(workspaceId, userId);
        // 그 사이 워크스페이스를 바꿨으면(더 새 요청이 있으면) 버려요.
        if (id === membersRequestId.current) setMembers(list);
      } catch {
        // 팀원 목록을 못 불러와도 화면은 계속 써요(헤더의 팀원 표시만 비어요).
        if (id === membersRequestId.current) setMembers([]);
      }
    },
    [userId],
  );

  const refreshPages = useCallback(
    () => (currentWorkspaceId == null ? Promise.resolve() : loadPages(currentWorkspaceId, { silent: true })),
    [currentWorkspaceId, loadPages],
  );

  // 로그인한 사람이 바뀌면 전부 비우고, 로그인 상태면 워크스페이스를 불러와요.
  useEffect(() => {
    workspaceRequestId.current++;
    pagesRequestId.current++;
    membersRequestId.current++;
    saveTimers.current.forEach((timer) => clearTimeout(timer));
    saveTimers.current.clear();
    pendingCreates.current.clear();
    pageIdMapRef.current = {};

    /* eslint-disable react-hooks/set-state-in-effect */
    setPageIdMap({});
    setWorkspaces([]);
    setCurrentWorkspaceId(null);
    setWorkspaceError(null);
    setPages([]);
    setMembers([]);
    setPagesLoadedFor(null);
    setPagesError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (userId != null) loadWorkspaces();
  }, [userId, loadWorkspaces]);

  // 현재 워크스페이스가 정해지거나 바뀌면 그 워크스페이스의 페이지와 팀원을 불러와요.
  useEffect(() => {
    if (userId == null || currentWorkspaceId == null) return;

    loadPages(currentWorkspaceId);
    loadMembers(currentWorkspaceId);
  }, [userId, currentWorkspaceId, loadPages, loadMembers]);

  // 화면이 사라질 때 대기 중인 타이머를 정리해요.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const pagesLoading = currentWorkspaceId != null && pagesLoadedFor !== currentWorkspaceId;

  const reloadPages = () => {
    if (currentWorkspaceId == null) return;
    setPagesLoadedFor(null);
    loadPages(currentWorkspaceId);
  };

  // 서버 호출이 실패했을 때 사용자에게 알려요(토스트 UI가 생기기 전까지 alert).
  const notifyError = (err, fallback) => window.alert(getErrorMessage(err, fallback));

  /* ---------- 스프린트 · 작업 · 칸반 상태 (서버 연결) ---------- */

  // 스프린트 목록/상세, 스프린트 작업 목록, 칸반 보드, 페이지 TASK 블록이 이 데이터 하나를 같이 읽고 써요.
  // 워크스페이스가 바뀌면 훅이 알아서 비우고 다시 불러와요.
  const sprintData = useSprintData({ userId, workspaceId: currentWorkspaceId });

  /* ---------- 페이지 (서버 연결) ---------- */

  // 블록 에디터(하위 페이지 링크 · 복제)는 페이지를 "즉시" 받아서 블록에 넣어야 해서 서버 응답을 기다릴 수 없어요.
  // 그래서 화면에는 임시 페이지(음수 id)를 먼저 보여주고, 서버가 실제 페이지를 만들어 주면 그 자리를 실제 페이지로
  // 바꿔요. 임시 id → 실제 id는 pageIdMap에 남겨서, 임시 id를 들고 있는 블록도 실제 페이지를 찾을 수 있게 해요.
  const localId = useRef(0);
  const nextLocalId = () => --localId.current;

  const [pageIdMap, setPageIdMap] = useState({});
  const pageIdMapRef = useRef(pageIdMap);
  // 임시 id → 서버 생성이 끝나면 실제 id를 주는 Promise
  const pendingCreates = useRef(new Map());

  const resolvePageId = (id) => pageIdMapRef.current[id] ?? id;

  // 서버 페이지에 할 일을 그 페이지의 실제 id로 실행해요. 임시 페이지면 생성이 끝나길 기다렸다가 실행하고,
  // 실행할 수 없는 id면 null을 돌려줘요.
  const runOnServerPage = (pageId, fn) => {
    const id = resolvePageId(pageId);
    if (isServerId(id)) return fn(id);
    const pending = pendingCreates.current.get(id);
    return pending ? pending.then(fn) : null;
  };

  const waitForServerId = (pageId) => runOnServerPage(pageId, (id) => id) ?? Promise.reject(new Error("page not found"));

  // 휴지통 시각(trashedAt)은 "같이 삭제된 묶음"을 구분하는 표지로도 써요(복원할 때
  // 같은 값인 하위 페이지만 같이 되돌리거든요). 서로 다른 삭제가 같은 밀리초에
  // 몰려도 값이 겹치지 않게 항상 직전보다 큰 값을 만들어요.
  const lastStamp = useRef(0);
  const nextStamp = () => {
    const now = Math.max(Date.now(), lastStamp.current + 1);
    lastStamp.current = now;
    return new Date(now).toISOString();
  };

  const buildBlankPage = (workspaceId, parentPageId = null) => ({
    id: nextLocalId(),
    workspaceId,
    parentPageId,
    title: "제목 없음",
    icon: "📄",
    cover: null,
    createdBy: creatorName,
    // 데이터베이스의 CREATED_TIME 속성(생성 일시)이 이 값을 그대로 읽어요.
    createdAt: new Date().toISOString(),
  });

  // 임시 페이지를 화면에 넣고, request()가 서버 페이지를 만들어 주면 그 자리를 실제 페이지로 바꿔요.
  // 실패하면 임시 페이지를 걷어내고 안내해요. 임시 페이지를 바로 돌려줘요.
  const registerTempPage = (temp, request, { refreshAfter = false, errorMessage } = {}) => {
    setPages((prev) => [...prev, temp]);

    const promise = request()
      .then((real) => {
        // 서버 응답을 기다리는 동안 사용자가 제목·아이콘을 고쳤다면 그 값을 서버에도 보내요.
        const local = pagesRef.current.find((p) => p.id === temp.id);
        const edited = local && (local.title !== temp.title || local.icon !== temp.icon);
        const page = edited ? { ...real, title: local.title, icon: local.icon } : real;

        pageIdMapRef.current = { ...pageIdMapRef.current, [temp.id]: real.id };
        setPageIdMap(pageIdMapRef.current);
        setPages((prev) => prev.map((p) => (p.id === temp.id ? page : p)));
        pendingCreates.current.delete(temp.id);

        if (edited) pageApi.updatePage(page).catch((err) => console.error("페이지 저장 실패", err));
        if (refreshAfter) refreshPages();
        return real.id;
      })
      .catch((err) => {
        pendingCreates.current.delete(temp.id);
        setPages((prev) => prev.filter((p) => p.id !== temp.id));
        notifyError(err, errorMessage ?? "페이지를 만들지 못했어요.");
        throw err;
      });

    promise.catch(() => {}); // 기다리는 쪽이 없어도 "처리 안 된 오류"가 뜨지 않게 해요.
    pendingCreates.current.set(temp.id, promise);
    return temp;
  };

  // 블록 에디터용: 하위 페이지를 만들어요. 임시 페이지를 바로 돌려주고 서버에는 뒤에서 만들어요.
  const createChildPage = (parentPageId = null) => {
    const parent = parentPageId == null ? null : pages.find((p) => p.id === resolvePageId(parentPageId));
    const workspaceId = parent ? (parent.workspaceId ?? DEFAULT_WORKSPACE_ID) : currentWorkspaceId;
    const temp = buildBlankPage(workspaceId, parentPageId == null ? null : resolvePageId(parentPageId));

    return registerTempPage(temp, async () => {
      const parentId = parentPageId == null ? null : await waitForServerId(parentPageId);
      return pageApi.createPage(workspaceId, { parentPageId: parentId });
    });
  };

  // 페이지를 통째로 복제해요(하위 페이지 · 블록 · 데이터베이스까지 서버가 복사하고, 블록 안의 하위 페이지 링크도
  // 복제본을 가리키게 바꿔줘요). 복제본의 임시 페이지를 바로 돌려줘요.
  const duplicatePage = (pageId, parentPageId) => {
    const sourceId = resolvePageId(pageId);
    const source = pagesRef.current.find((p) => p.id === sourceId);
    if (!source) return null;

    const temp = {
      ...source,
      id: nextLocalId(),
      parentPageId: parentPageId == null ? source.parentPageId : resolvePageId(parentPageId),
      createdAt: new Date().toISOString(),
      trashedAt: null,
    };

    return registerTempPage(
      temp,
      async () => {
        const [fromId, toId] = await Promise.all([
          waitForServerId(pageId),
          parentPageId == null ? null : waitForServerId(parentPageId),
        ]);
        return pageApi.duplicatePage(fromId, toId);
      },
      { refreshAfter: true, errorMessage: "페이지를 복제하지 못했어요." },
    );
  };

  // 사이드바의 "새 페이지"처럼 서버에 만드는 페이지예요. 서버가 준 id로 상태에 넣고 그 페이지를 돌려줘요.
  // 실패하면 안내하고 null을 돌려줘요.
  const createPage = async (parentPageId = null) => {
    const parent = parentPageId == null ? null : pages.find((p) => p.id === parentPageId);

    // 아직 서버에 만드는 중인 임시 페이지 아래에는 같은 임시 방식으로 만들어요.
    if (parent && !isServerId(parent.id)) return createChildPage(parentPageId);

    try {
      const page = await pageApi.createPage(parent ? parent.workspaceId : currentWorkspaceId, {
        parentPageId,
      });
      setPages((prev) => [...prev, page]);
      return page;
    } catch (err) {
      notifyError(err, "페이지를 만들지 못했어요.");
      return null;
    }
  };

  // 제목·아이콘 같은 페이지 정보를 고쳐요. 화면에는 바로 반영하고, 서버에는 잠깐 기다렸다가
  // (타이핑 중 요청 폭주 방지) 한 번만 보내요. 블록은 usePageBlocks, 커버는 updateCover가 따로 저장해요.
  const updatePage = (pageId, patch) => {
    pageId = resolvePageId(pageId);
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...patch } : p)));

    if (!isServerId(pageId) || !("title" in patch || "icon" in patch)) return;

    clearTimeout(saveTimers.current.get(pageId));
    saveTimers.current.set(
      pageId,
      setTimeout(async () => {
        saveTimers.current.delete(pageId);

        const page = pagesRef.current.find((p) => p.id === pageId);
        if (!page || page.trashedAt) return;

        try {
          await pageApi.updatePage(page);
        } catch (err) {
          console.error("페이지 저장 실패", err);
        }
      }, PAGE_SAVE_DELAY_MS),
    );
  };

  // 커버 바꾸기: change는 { defaultUrl: "/covers/beach.png" }(기본 커버) · { file }(업로드) · null(지우기).
  // 화면에는 바로 미리 보여주고, 서버에 저장되면 서버 주소로 바꿔요. 실패하면 원래대로 돌려요.
  const updateCover = async (pageId, change) => {
    const id = resolvePageId(pageId);
    if (!isServerId(id)) return;

    const before = pagesRef.current.find((p) => p.id === id)?.cover ?? null;
    const preview = change == null ? null : change.file ? URL.createObjectURL(change.file) : change.defaultUrl;
    const setCover = (cover) => setPages((prev) => prev.map((p) => (p.id === id ? { ...p, cover } : p)));

    setCover(preview);

    try {
      let saved;
      if (change == null) saved = await pageApi.deleteCover(id);
      else if (change.file) saved = await pageApi.uploadCover(id, change.file);
      else saved = await pageApi.applyDefaultCover(id, change.defaultUrl.split("/").pop().replace(/\.[^.]+$/, ""));

      setCover(saved.cover);
    } catch (err) {
      setCover(before);
      notifyError(err, "커버를 저장하지 못했어요.");
    } finally {
      if (change?.file) URL.revokeObjectURL(preview);
    }
  };

  // 데이터베이스의 TITLE 열이 "행 = 페이지"의 제목을 그대로 읽고 쓸 수 있게 하는 제목 변경 함수예요.
  // 지금 보고 있는 페이지가 아니라 임의의 pageId를 바꿀 수 있어야 해서 따로 둬요.
  const renamePage = (pageId, title) => updatePage(pageId, { title });

  // 삭제 = 휴지통으로 이동이에요. 화면에는 바로 반영하고(trashedAt만 채움, 이미 휴지통에 있던
  // 하위 페이지는 시각을 덮어쓰지 않아요), 서버에 알린 뒤 서버 상태와 다시 맞춰요.
  const deletePage = (pageId) => {
    pageId = resolvePageId(pageId);
    const trashedAt = nextStamp();
    setPages((prev) => {
      const idsToTrash = collectWithDescendants(prev, pageId);
      return prev.map((p) => (idsToTrash.has(p.id) && !p.trashedAt ? { ...p, trashedAt } : p));
    });

    runOnServerPage(pageId, (id) => pageApi.deletePage(id))
      ?.catch((err) => notifyError(err, "페이지를 삭제하지 못했어요."))
      .finally(refreshPages);
  };

  // 휴지통에서 "복원" — 이 페이지와 "같은 시각에 같이 휴지통으로 간" 하위 페이지만 되돌려요.
  // 부모가 아직 휴지통에 있으면 최상위로 올려서 바로 보이게 해요(서버가 같은 규칙으로 처리해요).
  const restorePage = (pageId) =>
    (
      runOnServerPage(pageId, (id) => pageApi.restorePage(id)) ?? Promise.resolve()
    )
      .catch((err) => notifyError(err, "페이지를 복원하지 못했어요."))
      .finally(refreshPages);

  // 휴지통에서 "완전히 삭제" — 서버에서 지워지면 목록을 다시 맞춰요.
  const permanentlyDeletePage = (pageId) =>
    (
      runOnServerPage(pageId, (id) => pageApi.deletePagePermanently(id)) ?? Promise.resolve()
    )
      .catch((err) => notifyError(err, "페이지를 완전히 삭제하지 못했어요."))
      .finally(refreshPages);

  // 휴지통 비우기 — 지금 워크스페이스의 휴지통만 비워요. 회고 페이지는 서버가 남겨둬요.
  const emptyTrash = () => {
    if (currentWorkspaceId == null) return Promise.resolve();

    return pageApi
      .emptyTrash(currentWorkspaceId)
      .catch((err) => notifyError(err, "휴지통을 비우지 못했어요."))
      .finally(refreshPages);
  };

  // Sidebar에서 최상위 페이지를 드래그해서 순서를 바꿀 때 호출돼요.
  // pages 배열의 순서가 곧 "표시 순서"라, 최상위 페이지가 원래 있던 자리(topLevelSlots)에
  // Sidebar가 넘겨준 새 순서대로 다시 꽂아 넣어요. 하위 페이지들은 자기 자리에 그대로 있어요.
  // 서버에는 서버에 있는 페이지의 순서만 보내요.
  const reorderTopLevelPages = (orderedIds) => {
    setPages((prev) => {
      const topLevelSlots = [];
      prev.forEach((p, i) => {
        if (!p.parentPageId && !p.trashedAt && inWorkspace(p, currentWorkspaceId)) topLevelSlots.push(i);
      });
      if (topLevelSlots.length !== orderedIds.length) return prev;

      const next = [...prev];
      orderedIds.forEach((id, i) => {
        const page = prev.find((p) => p.id === id);
        if (page) next[topLevelSlots[i]] = page;
      });
      return next;
    });

    const serverIds = orderedIds.filter(isServerId);
    if (currentWorkspaceId == null || serverIds.length < 2) return;

    pageApi.reorderPages(currentWorkspaceId, serverIds).catch((err) => {
      notifyError(err, "페이지 순서를 저장하지 못했어요.");
      refreshPages();
    });
  };

  /* ---------- 워크스페이스 전환 · 만들기 ---------- */

  // 다른 워크스페이스로 들어가요. 이전 워크스페이스의 페이지·팀원은 바로 비워서 잠깐이라도
  // 섞여 보이지 않게 하고, 새 목록은 위의 effect가 불러와요.
  const enterWorkspace = (workspaceId) => {
    pagesRequestId.current++;
    membersRequestId.current++;
    setPages([]);
    setMembers([]);
    setPagesLoadedFor(null);
    setPagesError(null);
    setCurrentWorkspaceId(workspaceId);
    if (userId != null) saveWorkspaceId(userId, workspaceId);
  };

  // 워크스페이스 전환은 "지금 보는 워크스페이스"만 바꿔요. 화면 이동(홈으로 가기)은
  // 호출하는 쪽(Sidebar)이 router로 처리해요.
  const switchWorkspace = (workspaceId) => {
    if (!workspaces.some((w) => w.id === workspaceId)) return false;
    if (workspaceId !== currentWorkspaceId) enterWorkspace(workspaceId);
    return true;
  };

  // 워크스페이스를 만들고 → 첫 페이지(빈 "제목 없음")를 하나 만들고 → 초대를 보내고 → 현재
  // 워크스페이스로 전환해요. 첫 페이지가 있어야 만들자마자 보여줄 화면이 생겨요.
  // 이름이 비어 있으면 null, 만들기에 실패하면 예외를 던져요(호출한 화면이 안내 문구를 보여줘요).
  // 초대는 이메일마다 따로 보내고, 실패한 이메일은 failedInvites로 돌려줘요(워크스페이스는 이미 만들어진 뒤라서요).
  const createWorkspace = async ({ name, initials, color, icon, invitedMembers = [] }) => {
    const trimmedName = (name ?? "").trim();
    if (!trimmedName) return null;

    const workspace = await workspaceApi.createWorkspace({
      name: trimmedName,
      initials: (initials ?? "").trim() || fallbackInitials(trimmedName),
      color,
      icon,
    });

    let page = null;
    try {
      page = await pageApi.createPage(workspace.id);
    } catch {
      // 첫 페이지를 못 만들어도 워크스페이스는 쓸 수 있어요(사이드바에서 새로 만들면 돼요).
    }

    const failedInvites = [];
    for (const member of invitedMembers) {
      try {
        await workspaceApi.inviteMember(workspace.id, member.email);
      } catch (err) {
        failedInvites.push({ email: member.email, message: getErrorMessage(err) });
      }
    }

    setWorkspaces((prev) => [...prev, workspace]);
    enterWorkspace(workspace.id);

    return { workspace, page, failedInvites };
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null;

  /* ---------- 워크스페이스 설정(수정 · 멤버 · 나가기 · 삭제) ---------- */

  // 지금 워크스페이스의 이름·이니셜·색·아이콘을 고쳐요(소유자만 — 서버가 확인해요). 실패하면 예외를 던져요.
  const updateCurrentWorkspace = async (form) => {
    if (currentWorkspaceId == null) return null;
    const updated = await workspaceApi.updateWorkspace(currentWorkspaceId, form);
    setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    return updated;
  };

  const reloadMembers = () => (currentWorkspaceId == null ? Promise.resolve() : loadMembers(currentWorkspaceId));

  const inviteToCurrentWorkspace = (email) => workspaceApi.inviteMember(currentWorkspaceId, email);

  const removeMemberFromCurrentWorkspace = async (memberId) => {
    await workspaceApi.removeMember(currentWorkspaceId, memberId);
    await reloadMembers();
  };

  // 소유권을 넘기면 내 역할과 멤버들의 역할이 바뀌니까 워크스페이스 목록(내 역할)과 멤버를 다시 받아요.
  const transferCurrentOwnership = async (memberId) => {
    await workspaceApi.transferOwnership(currentWorkspaceId, memberId);
    await Promise.all([loadWorkspaces(), reloadMembers()]);
  };

  // 나가기·삭제 뒤에는 남은 워크스페이스 중 첫 번째로 옮겨가요. 화면 이동(홈으로)은 부르는 쪽이 해요.
  const leaveOrDropCurrent = async (request) => {
    const leavingId = currentWorkspaceId;
    await request(leavingId);

    const rest = workspaces.filter((w) => w.id !== leavingId);
    setWorkspaces(rest);
    if (rest.length > 0) enterWorkspace(rest[0].id);
  };

  const leaveCurrentWorkspace = () => leaveOrDropCurrent(workspaceApi.leaveWorkspace);
  const deleteCurrentWorkspace = () => leaveOrDropCurrent(workspaceApi.deleteWorkspace);

  // 사이드바는 지금 워크스페이스의 페이지만 보여줘야 해서 걸러진 목록을 따로 내보내요.
  // 전체 pages는 그대로 두는 이유는 setPages 업데이터와 BlockEditor의 페이지 링크 조회가 전체 배열 기준이라서예요.
  const pagesInWorkspace = useMemo(
    () => pages.filter((p) => inWorkspace(p, currentWorkspaceId)),
    [pages, currentWorkspaceId],
  );
  const value = {
    // 워크스페이스
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    workspaceError,
    reloadWorkspaces: loadWorkspaces,
    switchWorkspace,
    createWorkspace,
    updateCurrentWorkspace,
    inviteToCurrentWorkspace,
    removeMemberFromCurrentWorkspace,
    transferCurrentOwnership,
    leaveCurrentWorkspace,
    deleteCurrentWorkspace,
    reloadMembers,
    // 페이지
    pages,
    setPages,
    pagesInWorkspace,
    pagesLoading,
    pagesError,
    reloadPages,
    createPage,
    createChildPage,
    pageIdMap,
    duplicatePage,
    updatePage,
    updateCover,
    deletePage,
    restorePage,
    permanentlyDeletePage,
    emptyTrash,
    reorderTopLevelPages,
    renamePage,
    // 스프린트 · 작업 · 칸반 상태
    sprintsInWorkspace: sprintData.sprints,
    backlog: sprintData.backlog,
    taskStatuses: sprintData.statuses,
    sprintTasks: sprintData.tasks,
    sprintDataLoading: sprintData.loading,
    sprintDataError: sprintData.error,
    reloadSprintData: sprintData.reload,
    createSprint: sprintData.createSprint,
    changeSprintStatus: sprintData.changeSprintStatus,
    deleteSprint: sprintData.deleteSprint,
    createTask: sprintData.createTask,
    updateTask: sprintData.updateTask,
    deleteTasks: sprintData.deleteTasks,
    moveTaskOnBoard: sprintData.moveTaskOnBoard,
    toggleSubtask: sprintData.toggleSubtask,
    addSubtasks: sprintData.addSubtasks,
    deleteSubtask: sprintData.deleteSubtask,
    createStatus: sprintData.createStatus,
    saveStatus: sprintData.saveStatus,
    deleteStatus: sprintData.deleteStatus,
    reorderStatuses: sprintData.reorderStatuses,
    // 레이아웃용 데이터(사이드바 메뉴 · 헤더의 팀원)
    navigation: NAVIGATION,
    members,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
