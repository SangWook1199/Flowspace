import { useRef, useState } from "react";
import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal";
import { Outlet } from "react-router-dom";
import { members, navigation } from "../mock/dashboard";
import { pages as pagesMock } from "../mock/pages";
import { sprintTaskRows } from "../mock/sprintTasks";

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
// 고아 행이에요). deletePage가 지운 page id들을 받아서, 모든 페이지의
// DATABASE 블록을 훑어 그 페이지를 가리키던 행(과 그 행의 셀)을 같이
// 걷어내요.
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

export default function MainLayout() {
  // pages/{pageId} API로 교체 예정. 세션 동안 사이드바 · 페이지 상세 ·
  // 하위 페이지 목록이 같은 상태를 보도록 여기서 끌어올려 관리하고
  // Outlet context로 내려줍니다.
  const [pages, setPages] = useState(pagesMock);

  // 스프린트 태스크도 여기서 끌어올려요 — 이제 페이지 TASK 블록
  // (BlockEditor.jsx), 스프린트 작업 목록(SprintTasks.jsx), 칸반 보드
  // (Kanban.jsx)가 전부 이 배열 하나를 같이 읽고 써요. 예전엔
  // mock/kanban.js의 kanbanTasks가 따로 있어서 세 화면이 서로 다른
  // 데이터를 보여줬는데(심지어 같은 "SP1-2" 코드가 화면마다 다른
  // 작업이었어요), 이제 mock/sprintTasks.js의 sprintTaskRows 하나로
  // 합쳤어요 — 세 화면 중 어디서 체크박스를 누르거나 값을 바꿔도
  // setSprintTasks를 통해 여기 state가 바뀌고, 나머지 화면도 다음에
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

  // 워크스페이스 설정 모달 열림 상태. Sidebar(여는 버튼)와 모달 자체가
  // 서로 형제 관계라 여기(공통 부모)에서 들고 내려줘요.
  const [settingsOpen, setSettingsOpen] = useState(false);

  // id를 pages state에서 Math.max로 매번 계산하면, 아주 짧은 시간에
  // 페이지 생성이 두 번 겹칠 때(더블클릭 등) 리렌더 전에 같은 id가
  // 나올 수 있어요. ref 카운터는 호출 즉시 동기적으로 증가하니까
  // 그런 경합이 없어요.
  const nextPageId = useRef(Math.max(0, ...pagesMock.map((p) => p.id)) + 1);

  const createPage = (parentPageId = null) => {
    const id = nextPageId.current++;
    const newPage = {
      id,
      workspaceId: 1,
      parentPageId,
      title: "제목 없음",
      icon: "📄",
      cover: null,
      createdBy: "상욱",
      // 데이터베이스의 CREATED_TIME 속성(생성 일시)이 이 값을 그대로 읽어요.
      createdAt: new Date().toISOString(),
      blocks: [{ id: 1, type: "TEXT", content: "" }],
    };

    setPages((prev) => [...prev, newPage]);
    return newPage;
  };

  // 삭제 = 휴지통으로 이동이에요. 배열에서 바로 걷어내는 대신
  // trashedAt만 채워서(위 collectWithDescendants 주석에서 처음부터
  // 얘기했던 soft-delete 방식), 실수로 지워도 휴지통에서 복원할 수
  // 있게 해요. 페이지 데이터/블록은 그대로 남아있으니 여기선
  // pruneRowsForDeletedPages(데이터베이스 행 정리)를 안 불러요 — 그건
  // 페이지가 진짜로 없어지는 permanentlyDeletePage/emptyTrash 쪽 일이에요.
  const deletePage = (pageId) => {
    setPages((prev) => {
      const idsToTrash = collectWithDescendants(prev, pageId);
      const trashedAt = new Date().toISOString();
      return prev.map((p) => (idsToTrash.has(p.id) ? { ...p, trashedAt } : p));
    });
  };

  // 휴지통에서 "복원" — pageId와 그 하위 페이지들 중 지금 휴지통에
  // 있는 것만 trashedAt을 지워서 되돌려요.
  const restorePage = (pageId) => {
    setPages((prev) => {
      const idsToRestore = collectWithDescendants(prev, pageId);
      return prev.map((p) =>
        idsToRestore.has(p.id) && p.trashedAt ? { ...p, trashedAt: null } : p,
      );
    });
  };

  // 휴지통에서 "완전히 삭제" — 예전 deletePage가 하던 하드 삭제
  // 그대로예요. 이때는 페이지가 진짜로 사라지니까
  // pruneRowsForDeletedPages로 그 페이지를 가리키던 데이터베이스 행도
  // 같이 정리해요.
  const permanentlyDeletePage = (pageId) => {
    setPages((prev) => {
      const idsToDelete = collectWithDescendants(prev, pageId);
      const remaining = prev.filter((p) => !idsToDelete.has(p.id));
      return pruneRowsForDeletedPages(remaining, idsToDelete);
    });
  };

  // 휴지통 비우기 — 지금 trashedAt이 있는 페이지를 전부 한 번에
  // 완전히 삭제해요(각 페이지의 하위 페이지는 trashedAt 전파 때 같이
  // 휴지통으로 갔을 테니, 이 목록에 이미 다 포함돼 있어요).
  const emptyTrash = () => {
    setPages((prev) => {
      const idsToDelete = new Set(prev.filter((p) => p.trashedAt).map((p) => p.id));
      if (idsToDelete.size === 0) return prev;
      const remaining = prev.filter((p) => !idsToDelete.has(p.id));
      return pruneRowsForDeletedPages(remaining, idsToDelete);
    });
  };

  // Sidebar에서 최상위 페이지를 드래그해서 순서를 바꿀 때 호출돼요.
  // pages 배열엔 최상위/하위 페이지가 섞여 있고 순서 자체가 곧
  // "표시 순서"라, 최상위 페이지가 원래 있던 자리(topLevelSlots)에
  // Sidebar가 넘겨준 새 순서대로 다시 꽂아 넣어요 — 하위 페이지들은
  // 자기 자리에 그대로 있으니 따로 건드릴 필요가 없어요. 휴지통에 있는
  // 페이지는 Sidebar 목록에도 orderedIds에도 안 잡히니까, 슬롯 계산도
  // 똑같이 trashedAt을 제외해야 개수가 안 어긋나요.
  const reorderTopLevelPages = (orderedIds) => {
    setPages((prev) => {
      const topLevelSlots = [];
      prev.forEach((p, i) => {
        if (!p.parentPageId && !p.trashedAt) topLevelSlots.push(i);
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

  return (
    <>
      <Sidebar
        navigation={navigation}
        pages={pages}
        onCreatePage={createPage}
        onDeletePage={deletePage}
        onRestorePage={restorePage}
        onPermanentlyDeletePage={permanentlyDeletePage}
        onEmptyTrash={emptyTrash}
        onReorderTopLevelPages={reorderTopLevelPages}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className={styles.main}>
        <Header members={members} />
        <Outlet
          context={{
            pages,
            setPages,
            createPage,
            deletePage,
            restorePage,
            permanentlyDeletePage,
            renamePage,
            sprintTasks,
            setSprintTasks,
            toggleSubtask,
          }}
        />
      </main>
      {settingsOpen && (
        <WorkspaceSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
