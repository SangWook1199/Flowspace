import { useState } from "react";
import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useAuth } from "../context/useAuth";
import { useWorkspace } from "../context/WorkspaceContext";
import { MemberProfileProvider } from "../context/MemberProfileProvider";

// 워크스페이스 · 페이지 · 스프린트 태스크 상태와 그걸 바꾸는 함수들은 예전엔 여기서
// 들고 있었는데, MainLayout이 다시 마운트될 때마다(예: /workspace/create 같은
// 레이아웃 밖 라우트에 다녀오면) 전부 초기화되는 문제가 있었어요. 지금은
// WorkspaceProvider(App.jsx에서 Routes 위에 마운트)가 들고 있고, 여기는 그걸 읽어서
// 사이드바·헤더·Outlet에 이어주는 얇은 레이아웃이에요. 나중에 API를 붙일 때도
// 이 파일은 안 건드리고 WorkspaceProvider만 바꾸면 돼요.
//
// useWorkspace는 Provider가 없으면 어디를 놓쳤는지 알려주는 에러를 던져요.
const SPRINT_ORDER = { ACTIVE: 0, PLANNING: 1, COMPLETED: 2 };

export default function MainLayout() {
  const {
    navigation,
    members,
    workspaces,
    currentWorkspace,
    switchWorkspace,
    workspaceError,
    reloadWorkspaces,
    pagesLoading,
    pagesError,
    reloadPages,
    pages,
    setPages,
    pagesInWorkspace,
    sprintsInWorkspace,
    backlog,
    taskStatuses,
    sprintTasks,
    sprintDataLoading,
    sprintDataError,
    reloadSprintData,
    createSprint,
    changeSprintStatus,
    deleteSprint,
    createTask,
    updateTask,
    deleteTasks,
    moveTaskOnBoard,
    toggleSubtask,
    addSubtasks,
    deleteSubtask,
    createStatus,
    saveStatus,
    deleteStatus,
    reorderStatuses,
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
  } = useWorkspace();

  // 워크스페이스 설정 모달 열림 상태. Sidebar(여는 버튼)와 모달 자체가
  // 서로 형제 관계라 여기(공통 부모)에서 들고 내려줘요. 화면 안에서만 쓰는
  // UI 상태라 Provider로 올리지 않았어요.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();

  // 워크스페이스 목록을 아직 못 받았거나 실패했을 때는 사이드바·헤더를 그릴 수 없어요
  // (현재 워크스페이스가 있어야 이름·페이지를 보여줘요).
  if (!currentWorkspace) {
    return (
      <div style={{ margin: "auto", padding: 40, textAlign: "center" }} role="status">
        {workspaceError ? (
          <>
            <p role="alert">{workspaceError}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" onClick={reloadWorkspaces}>
                다시 시도
              </button>
              {/* 워크스페이스가 하나도 없으면 막다른 화면이 되지 않게 새로 만들거나 로그아웃할 수 있어요. */}
              <button type="button" onClick={() => navigate("/workspace/create")}>
                워크스페이스 만들기
              </button>
              <button type="button" onClick={() => window.confirm("로그아웃할까요?") && logout()}>
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <p>워크스페이스를 불러오는 중이에요…</p>
        )}
      </div>
    );
  }

  // 사이드바의 "현재 스프린트"는 진행 중 → 계획됨 → 완료 순으로 위에서 세 개만 보여줘요.
  const sidebarSprints = [...sprintsInWorkspace].sort(
    (a, b) => (SPRINT_ORDER[a.status] ?? 3) - (SPRINT_ORDER[b.status] ?? 3),
  );

  return (
    <MemberProfileProvider>
      <Sidebar
        navigation={navigation}
        pages={pagesInWorkspace}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        sprints={sidebarSprints}
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
        <Header members={members} workspaceId={currentWorkspace.id} />
        <ErrorBoundary resetKey={pathname}>
        <Outlet
          context={{
            workspaceId: currentWorkspace.id,
            pages,
            setPages,
            pagesLoading,
            pagesError,
            reloadPages,
            createChildPage,
            pageIdMap,
            duplicatePage,
            updatePage,
            updateCover,
            deletePage,
            restorePage,
            permanentlyDeletePage,
            renamePage,
            members,
            sprints: sprintsInWorkspace,
            backlog,
            taskStatuses,
            sprintTasks,
            sprintDataLoading,
            sprintDataError,
            reloadSprintData,
            createSprint,
            changeSprintStatus,
            deleteSprint,
            createTask,
            updateTask,
            deleteTasks,
            moveTaskOnBoard,
            toggleSubtask,
            addSubtasks,
            deleteSubtask,
            createStatus,
            saveStatus,
            deleteStatus,
            reorderStatuses,
          }}
        />
        </ErrorBoundary>
      </main>
      {settingsOpen && (
        <WorkspaceSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </MemberProfileProvider>
  );
}
