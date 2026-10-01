import { useState } from "react";
import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal";
import { Outlet } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";

// 워크스페이스 · 페이지 · 스프린트 태스크 상태와 그걸 바꾸는 함수들은 예전엔 여기서
// 들고 있었는데, MainLayout이 다시 마운트될 때마다(예: /workspace/create 같은
// 레이아웃 밖 라우트에 다녀오면) 전부 초기화되는 문제가 있었어요. 지금은
// WorkspaceProvider(App.jsx에서 Routes 위에 마운트)가 들고 있고, 여기는 그걸 읽어서
// 사이드바·헤더·Outlet에 이어주는 얇은 레이아웃이에요. 나중에 API를 붙일 때도
// 이 파일은 안 건드리고 WorkspaceProvider만 바꾸면 돼요.
//
// useWorkspace는 Provider가 없으면 어디를 놓쳤는지 알려주는 에러를 던져요.
export default function MainLayout() {
  const {
    navigation,
    members,
    workspaces,
    currentWorkspace,
    switchWorkspace,
    pages,
    setPages,
    pagesInWorkspace,
    sprintsInWorkspace,
    sprintTasks,
    setSprintTasks,
    toggleSubtask,
    createPage,
    duplicatePage,
    deletePage,
    restorePage,
    permanentlyDeletePage,
    emptyTrash,
    reorderTopLevelPages,
    renamePage,
  } = useWorkspace();

  // 워크스페이스 설정 모달 열림 상태. Sidebar(여는 버튼)와 모달 자체가
  // 서로 형제 관계라 여기(공통 부모)에서 들고 내려줘요. 화면 안에서만 쓰는
  // UI 상태라 Provider로 올리지 않았어요.
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Sidebar
        navigation={navigation}
        pages={pagesInWorkspace}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        sprints={sprintsInWorkspace}
        onSwitchWorkspace={switchWorkspace}
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
            duplicatePage,
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
