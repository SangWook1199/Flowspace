import { useMemo, useRef, useState } from "react";
import WorkspaceContext from "./WorkspaceContext";
import { useAuth } from "./useAuth";
import { nextNumericId } from "../utils/id";

// 목데이터는 이 파일에서만 가져와요. 나중에 API를 붙일 때는 아래 useState 초기값을
// 서버 응답으로 바꾸고 각 함수 안의 setXxx 호출을 API 호출로 바꾸면 되니까, 수정할
// 곳이 이 파일 하나로 모여요.
import workspaceMock from "../mock/workspaceMock";
import { pages as pagesMock } from "../mock/pages";
import { sprintTaskRows } from "../mock/sprintTasks";
import { sprints as sprintsMock } from "../mock/sprints";
import { members as membersMock, navigation as navigationMock } from "../mock/dashboard";

// workspaceId가 없는 목데이터(예: sprints)는 1번 워크스페이스 소속으로 봐요.
const DEFAULT_WORKSPACE_ID = 1;
const DEFAULT_CREATOR = "상욱"; // 로그인 정보가 없을 때만 쓰는 예전 기본값이에요.
const DEFAULT_WORKSPACE_COLOR = "#4F46E5";

const inWorkspace = (item, workspaceId) =>
  (item.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId;

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

// 데이터베이스는 "행 = 페이지"라서, 어떤 페이지가 지워지면 그 페이지를
// 가리키던 다른 페이지의 데이터베이스 행도 같이 없어져야 해요. 행 자체의
// 휴지통 버튼으로 지울 때는 DatabaseBlock의 deleteRow가 페이지→행을
// 같이 지우지만, 페이지 상세 화면 자체의 "삭제" 버튼으로 지울 땐
// deletePage만 호출돼서 이 정리가 빠져 있었어요 — 그러면 그 행이
// "삭제된 페이지"로 계속 남아 있었죠(TitleCell이 우아하게 처리는 하지만,
// 고아 행이에요). 페이지가 진짜로 없어질 때 모든 페이지의 DATABASE 블록을
// 훑어 그 페이지를 가리키던 행(과 그 행의 셀)을 같이 걷어내요.
function pruneRowsForDeletedPages(pages, deletedIds) {
  return pages.map((page) => {
    if (!page.blocks?.length) return page;

    let changed = false;
    const blocks = page.blocks.map((block) => {
      if (block.type !== "DATABASE" || block.database?.kind !== "DATABASE") return block;

      const db = block.database;
      const removedRowIds = new Set(
        db.rows.filter((r) => r.pageId && deletedIds.has(r.pageId)).map((r) => r.id),
      );
      if (removedRowIds.size === 0) return block;

      changed = true;
      return {
        ...block,
        database: {
          ...db,
          rows: db.rows.filter((r) => !removedRowIds.has(r.id)),
          cells: db.cells.filter((c) => !removedRowIds.has(c.rowId)),
        },
      };
    });

    return changed ? { ...page, blocks } : page;
  });
}

// 하위 페이지 링크 블록(content는 비어있고 pageId만 있는 TEXT 블록)이 완전히
// 삭제된 페이지를 계속 가리키면 클릭해도 갈 곳이 없는 깨진 링크가 돼요. 블록
// 자체를 지우면 사용자가 쓴 흐름이 흐트러질 수 있어서, 블록은 그대로 두고
// pageId만 null로 풀어줘요(그러면 평범한 빈 텍스트 블록이 돼요).
function detachLinksToDeletedPages(pages, deletedIds) {
  return pages.map((page) => {
    if (!page.blocks?.length) return page;

    let changed = false;
    const blocks = page.blocks.map((block) => {
      if (block.type === "TEXT" && block.pageId != null && deletedIds.has(block.pageId)) {
        changed = true;
        return { ...block, pageId: null };
      }
      return block;
    });

    return changed ? { ...page, blocks } : page;
  });
}

// 페이지가 진짜로 없어질 때(완전 삭제 · 휴지통 비우기)의 뒷정리를 한 곳에 모아요.
function cleanupAfterPermanentDelete(pages, deletedIds) {
  const remaining = pages.filter((p) => !deletedIds.has(p.id));
  return detachLinksToDeletedPages(pruneRowsForDeletedPages(remaining, deletedIds), deletedIds);
}

// "홍길동", "Human EXE", "😀 팀" 같은 이름에서 이니셜을 뽑지 않고 쓰는 쪽(생성 화면)이
// 직접 만들어요 — 여기선 이니셜이 비어서 들어왔을 때의 안전망만 둬요.
// Array.from은 이모지(서로게이트 쌍)를 한 글자로 세어줘서 글자가 깨지지 않아요.
function fallbackInitials(name) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "H";
}

export function WorkspaceProvider({ children }) {
  // 로그인한 사람의 닉네임을 페이지 작성자(createdBy)로 써요. AuthProvider 안쪽에
  // 마운트되지만, 혹시 밖에서 쓰여도 죽지 않게 옵셔널 체이닝으로 받아요.
  const auth = useAuth();
  const creatorName = auth?.user?.nickname || DEFAULT_CREATOR;

  // workspaces API로 교체 예정. 생성 화면(MainLayout 밖 라우트)과 사이드바가 같은
  // 상태를 봐야 해서 라우트 위로 끌어올렸어요 — MainLayout이 다시 마운트돼도
  // (예: /workspace/create에 다녀와도) 목록·현재 워크스페이스가 안 초기화돼요.
  const [workspaces, setWorkspaces] = useState(workspaceMock.workspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(workspaceMock.currentWorkspaceId);

  // pages/{pageId} API로 교체 예정. 세션 동안 사이드바 · 페이지 상세 ·
  // 하위 페이지 목록이 같은 상태를 보도록 여기서 들고 있고
  // MainLayout이 Outlet context로 내려줍니다.
  const [pages, setPages] = useState(pagesMock);

  // 스프린트 태스크도 여기서 들고 있어요 — 이제 페이지 TASK 블록
  // (BlockEditor.jsx), 스프린트 작업 목록(SprintTasks.jsx), 칸반 보드
  // (Kanban.jsx)가 전부 이 배열 하나를 같이 읽고 써요. 예전엔
  // mock/kanban.js의 kanbanTasks가 따로 있어서 세 화면이 서로 다른
  // 데이터를 보여줬는데(심지어 같은 "SP1-2" 코드가 화면마다 다른
  // 작업이었어요), 이제 mock/sprintTasks.js의 sprintTaskRows 하나로
  // 합쳤어요 — 세 화면 중 어디서 체크박스를 누르거나 값을 바꿔도
  // setSprintTasks를 통해 이 state가 바뀌고, 나머지 화면도 다음에
  // 그릴 때 바로 반영돼요.
  const [sprintTasks, setSprintTasks] = useState(sprintTaskRows);

  const toggleSubtask = (taskId, subtaskIndex) => {
    setSprintTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.subtasks) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((s, i) =>
            i === subtaskIndex ? { ...s, checked: !s.checked } : s,
          ),
        };
      }),
    );
  };

  // id를 state에서 Math.max로 매번 계산하면, 아주 짧은 시간에 생성이 두 번
  // 겹칠 때(더블클릭 등) 리렌더 전에 같은 id가 나올 수 있어요. ref 카운터는
  // 호출 즉시 동기적으로 증가하니까 그런 경합이 없어요(처음 값만 nextNumericId로
  // "지금 있는 id 중 최댓값 + 1"을 구해요).
  const nextPageId = useRef(nextNumericId(pagesMock));
  const nextWorkspaceId = useRef(nextNumericId(workspaceMock.workspaces));

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
    id: nextPageId.current++,
    workspaceId,
    parentPageId,
    title: "제목 없음",
    icon: "📄",
    cover: null,
    createdBy: creatorName,
    // 데이터베이스의 CREATED_TIME 속성(생성 일시)이 이 값을 그대로 읽어요.
    createdAt: new Date().toISOString(),
    blocks: [{ id: 1, type: "TEXT", content: "" }],
  });

  // 하위 페이지는 부모와 같은 워크스페이스에 만들고, 최상위 페이지는 지금 보고 있는
  // 워크스페이스에 만들어요(예전엔 workspaceId가 1로 박혀 있었어요).
  const createPage = (parentPageId = null) => {
    const parent = parentPageId == null ? null : pages.find((p) => p.id === parentPageId);
    const workspaceId = parent
      ? (parent.workspaceId ?? DEFAULT_WORKSPACE_ID)
      : currentWorkspaceId;
    const newPage = buildBlankPage(workspaceId, parentPageId);

    setPages((prev) => [...prev, newPage]);
    return newPage;
  };

  // 노션처럼 페이지를 통째로 복제해요 — 그 페이지와 모든 하위 페이지를 새 id로 복사하고, 복사된 블록 안의
  // 하위 페이지 링크(pageId, 데이터베이스 행의 pageId)도 새로 만든 복사본을 가리키게 바꿔요. 그래서 하위 페이지를
  // 가리키는 블록을 복제/붙여넣기 해도 원본과 같은 페이지를 공유하지 않고(한쪽을 지우면 다른 쪽도 사라지던 문제),
  // 서로 독립된 페이지가 돼요. 복사본 루트 페이지를 돌려줘요.
  const duplicatePage = (pageId, parentPageId) => {
    const sourceIds = collectWithDescendants(pages, pageId);
    const sources = pages.filter((p) => sourceIds.has(p.id) && !p.trashedAt);
    const root = sources.find((p) => p.id === pageId);
    if (!root) return null;
    const idMap = new Map(sources.map((p) => [p.id, nextPageId.current++]));
    const remapId = (id) => (idMap.has(id) ? idMap.get(id) : id);
    const remapBlocks = (blocks) =>
      (blocks || []).map((b) => ({
        ...b,
        ...(b.pageId != null ? { pageId: remapId(b.pageId) } : {}),
        ...(b.database?.rows
          ? { database: { ...b.database, rows: b.database.rows.map((r) => (r.pageId != null ? { ...r, pageId: remapId(r.pageId) } : r)) } }
          : {}),
      }));
    const now = new Date().toISOString();
    const copies = sources.map((p) => ({
      ...p,
      id: idMap.get(p.id),
      parentPageId: p.id === pageId ? (parentPageId ?? p.parentPageId) : remapId(p.parentPageId),
      createdAt: now,
      blocks: remapBlocks(p.blocks),
    }));
    setPages((prev) => [...prev, ...copies]);
    return copies.find((c) => c.id === idMap.get(pageId));
  };

  // 삭제 = 휴지통으로 이동이에요. 배열에서 바로 걷어내는 대신
  // trashedAt만 채워서(위 collectWithDescendants 주석에서 처음부터
  // 얘기했던 soft-delete 방식), 실수로 지워도 휴지통에서 복원할 수
  // 있게 해요. 페이지 데이터/블록은 그대로 남아있으니 여기선
  // pruneRowsForDeletedPages(데이터베이스 행 정리)를 안 불러요 — 그건
  // 페이지가 진짜로 없어지는 permanentlyDeletePage/emptyTrash 쪽 일이에요.
  //
  // 이미 휴지통에 있던 하위 페이지는 건드리지 않아요. 그 시각을 덮어쓰면
  // "언제 지웠는지"가 사라지고, 복원할 때 "같이 지워진 묶음"도 구분할 수 없게 돼요.
  // (시각은 updater 밖에서 한 번만 만들어요 — updater는 StrictMode에서 두 번
  // 불릴 수 있어서, 안에서 만들면 두 번째 값이 달라질 수 있어요.)
  const deletePage = (pageId) => {
    const trashedAt = nextStamp();
    setPages((prev) => {
      const idsToTrash = collectWithDescendants(prev, pageId);
      return prev.map((p) => (idsToTrash.has(p.id) && !p.trashedAt ? { ...p, trashedAt } : p));
    });
  };

  // 휴지통에서 "복원" — 이 페이지와 "같은 시각에 같이 휴지통으로 간" 하위 페이지만
  // 되돌려요. 그보다 먼저 따로 지워뒀던 하위 페이지는 사용자가 이미 버린 거라
  // 그대로 휴지통에 남겨요. 부모가 아직 휴지통에 있으면 복원된 페이지가 사이드바에서
  // 안 보이는(부모가 없는 셈인) 상태가 되니까, 최상위로 올려서 바로 보이게 해요.
  const restorePage = (pageId) => {
    setPages((prev) => {
      const root = prev.find((p) => p.id === pageId);
      if (!root || !root.trashedAt) return prev;

      const stamp = root.trashedAt;
      const idsToRestore = collectWithDescendants(prev, pageId);
      const parent = root.parentPageId == null ? null : prev.find((p) => p.id === root.parentPageId);
      const parentUnavailable = root.parentPageId != null && (!parent || !!parent.trashedAt);

      return prev.map((p) => {
        if (!idsToRestore.has(p.id) || p.trashedAt !== stamp) return p;
        const restored = { ...p, trashedAt: null };
        if (p.id === pageId && parentUnavailable) restored.parentPageId = null;
        return restored;
      });
    });
  };

  // 휴지통에서 "완전히 삭제" — 예전 deletePage가 하던 하드 삭제
  // 그대로예요. 이때는 페이지가 진짜로 사라지니까 그 페이지를 가리키던
  // 데이터베이스 행과 하위 페이지 링크 블록도 같이 정리해요.
  const permanentlyDeletePage = (pageId) => {
    setPages((prev) => cleanupAfterPermanentDelete(prev, collectWithDescendants(prev, pageId)));
  };

  // 휴지통 비우기 — 지금 trashedAt이 있는 페이지를 전부 한 번에
  // 완전히 삭제해요(각 페이지의 하위 페이지는 trashedAt 전파 때 같이
  // 휴지통으로 갔을 테니, 이 목록에 이미 다 포함돼 있어요). 워크스페이스별로
  // 휴지통을 따로 보여주니까, 지금 보고 있는 워크스페이스의 휴지통만 비워요.
  const emptyTrash = () => {
    setPages((prev) => {
      const idsToDelete = new Set(
        prev.filter((p) => p.trashedAt && inWorkspace(p, currentWorkspaceId)).map((p) => p.id),
      );
      if (idsToDelete.size === 0) return prev;
      return cleanupAfterPermanentDelete(prev, idsToDelete);
    });
  };

  // Sidebar에서 최상위 페이지를 드래그해서 순서를 바꿀 때 호출돼요.
  // pages 배열엔 최상위/하위 페이지가 섞여 있고 순서 자체가 곧
  // "표시 순서"라, 최상위 페이지가 원래 있던 자리(topLevelSlots)에
  // Sidebar가 넘겨준 새 순서대로 다시 꽂아 넣어요 — 하위 페이지들은
  // 자기 자리에 그대로 있으니 따로 건드릴 필요가 없어요. 휴지통에 있는
  // 페이지와 다른 워크스페이스의 페이지는 Sidebar 목록에도 orderedIds에도
  // 안 잡히니까, 슬롯 계산도 똑같이 제외해야 개수가 안 어긋나요.
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
  };

  // 데이터베이스의 TITLE 열이 "행 = 페이지"의 제목을 그대로 읽고 쓸 수
  // 있게(별도 cells 값으로 안 두고) 페이지 제목만 바꾸는 작은 함수를
  // 따로 둬요 — PageDetailPage의 updatePage와 같은 패턴이지만, 지금
  // 보고 있는 페이지가 아니라 임의의 pageId를 바꿀 수 있어야 해서요.
  const renamePage = (pageId, title) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title } : p)));
  };

  // 워크스페이스 전환은 "지금 보는 워크스페이스"만 바꿔요. 화면 이동(홈으로 가기)은
  // 호출하는 쪽(Sidebar)이 router로 처리해요 — 이 Provider는 라우터와 무관하게 둬서
  // 나중에 API로 바꿔도 부담이 없어요.
  const switchWorkspace = (workspaceId) => {
    if (!workspaces.some((w) => w.id === workspaceId)) return false;
    setCurrentWorkspaceId(workspaceId);

    // TODO : Spring API
    // workspaceApi.changeWorkspace(workspaceId);
    return true;
  };

  // 워크스페이스를 만들고 → 현재 워크스페이스로 전환하고 → 첫 페이지(빈 "제목 없음")를
  // 하나 만들어 둬요. 첫 페이지가 있어야 만들자마자 보여줄 화면이 생겨요.
  // 만들어진 { workspace, page }를 돌려줘서, 호출한 화면이 그 페이지로 이동할 수 있어요.
  // 이름이 비어 있으면 아무것도 만들지 않고 null을 돌려줘요.
  const createWorkspace = ({ name, initials, color, invitedMembers = [] }) => {
    const trimmedName = (name ?? "").trim();
    if (!trimmedName) return null;

    const workspace = {
      id: nextWorkspaceId.current++,
      name: trimmedName,
      initials: (initials ?? "").trim() || fallbackInitials(trimmedName),
      color: color || DEFAULT_WORKSPACE_COLOR,
      invitedMembers,
    };
    const firstPage = buildBlankPage(workspace.id, null);

    // TODO : Spring API
    // workspaceApi.createWorkspace({ name, initials, color, invitedEmails })
    setWorkspaces((prev) => [...prev, workspace]);
    setPages((prev) => [...prev, firstPage]);
    setCurrentWorkspaceId(workspace.id);
    return { workspace, page: firstPage };
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  // 사이드바는 지금 워크스페이스의 페이지만 보여줘야 해서(전환하면 페이지 트리가
  // 바뀌어야 해요), 걸러진 목록을 따로 내보내요. 전체 pages는 그대로 두는 이유는
  // setPages 업데이터와 BlockEditor의 페이지 링크 조회가 전체 배열 기준이라서예요.
  const pagesInWorkspace = useMemo(
    () => pages.filter((p) => inWorkspace(p, currentWorkspaceId)),
    [pages, currentWorkspaceId],
  );
  const sprintsInWorkspace = useMemo(
    () => sprintsMock.filter((s) => inWorkspace(s, currentWorkspaceId)),
    [currentWorkspaceId],
  );

  const value = {
    // 워크스페이스
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    // 페이지
    pages,
    setPages,
    pagesInWorkspace,
    createPage,
    duplicatePage,
    deletePage,
    restorePage,
    permanentlyDeletePage,
    emptyTrash,
    reorderTopLevelPages,
    renamePage,
    // 스프린트
    sprintsInWorkspace,
    sprintTasks,
    setSprintTasks,
    toggleSubtask,
    // 레이아웃용 정적 데이터(사이드바 메뉴 · 헤더의 팀원)
    navigation: navigationMock,
    members: membersMock,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
