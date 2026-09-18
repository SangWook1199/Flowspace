import { useRef, useState } from "react";
import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import { members, navigation } from "../mock/dashboard";
import { pages as pagesMock } from "../mock/pages";

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

export default function MainLayout() {
  // pages/{pageId} API로 교체 예정. 세션 동안 사이드바 · 페이지 상세 ·
  // 하위 페이지 목록이 같은 상태를 보도록 여기서 끌어올려 관리하고
  // Outlet context로 내려줍니다.
  const [pages, setPages] = useState(pagesMock);

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

  const deletePage = (pageId) => {
    setPages((prev) => {
      const idsToDelete = collectWithDescendants(prev, pageId);
      return prev.filter((p) => !idsToDelete.has(p.id));
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
        members={members}
        onCreatePage={createPage}
        onDeletePage={deletePage}
      />
      <main className={styles.main}>
        <Header />
        <Outlet context={{ pages, setPages, createPage, deletePage, renamePage }} />
      </main>
    </>
  );
}
