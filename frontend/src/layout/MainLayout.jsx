import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal";
import NotificationBell from "./NotificationBell";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useAuth } from "../context/useAuth";
import useDialog from "../context/useDialog";
import { useWorkspace } from "../context/WorkspaceContext";
import { MemberProfileProvider } from "../context/MemberProfileProvider";
import { isAdminOrOwner } from "../utils/workspaceRole";

// 워크스페이스 · 페이지 · 스프린트 태스크 상태와 그걸 바꾸는 함수들은 예전엔 여기서
// 들고 있었는데, MainLayout이 다시 마운트될 때마다(예: /workspace/create 같은
// 레이아웃 밖 라우트에 다녀오면) 전부 초기화되는 문제가 있었어요. 지금은
// WorkspaceProvider(App.jsx에서 Routes 위에 마운트)가 들고 있고, 여기는 그걸 읽어서
// 사이드바·헤더·Outlet에 이어주는 얇은 레이아웃이에요. 나중에 API를 붙일 때도
// 이 파일은 안 건드리고 WorkspaceProvider만 바꾸면 돼요.
//
// useWorkspace는 Provider가 없으면 어디를 놓쳤는지 알려주는 에러를 던져요.
const SPRINT_ORDER = { ACTIVE: 0, PLANNING: 1, COMPLETED: 2 };

// 사이드바를 접었는지는 이 브라우저에 기억해요(저장소를 못 쓰면 매번 펼친 채로 시작해요).
const SIDEBAR_COLLAPSED_KEY = "flowspace.sidebar.collapsed";
const loadSidebarCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

// 이 폭보다 좁으면(폰·좁은 창) 사이드바는 본문을 밀지 않고 위에 겹쳐서 열려요.
const NARROW_QUERY = "(max-width: 900px)";
const isNarrowNow = () => {
  try {
    return window.matchMedia(NARROW_QUERY).matches;
  } catch {
    return false;
  }
};

// 브라우저 탭 제목이에요. 주소의 앞부분으로 화면을 가려요(위에서부터 먼저 맞는 것).
const TITLE_BY_PATH = [
  ["/sprints/ai", "AI 프로젝트 구성"],
  ["/sprints", "스프린트"],
  ["/kanban", "칸반 보드"],
  ["/calendar", "캘린더"],
  ["/retrospectives", "회고"],
  ["/pages", "페이지"],
  ["/activities", "활동 기록"],
];
const titleFor = (pathname) => {
  if (pathname === "/") return "대시보드";
  return TITLE_BY_PATH.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
};

export default function MainLayout() {
  const { confirm } = useDialog();
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
    updateSprint,
    changeSprintStatus,
    deleteSprint,
    createTask,
    updateTask,
    deleteTasks,
    moveTaskOnBoard,
    toggleSubtask,
    addSubtasks,
    deleteSubtask,
    renameSubtask,
    setSubtaskAssignee,
    moveSubtask,
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

  // 사이드바 접기. 접으면 본문(.main)과 화면 아래에 붙는 버튼 줄이 사이드바 자리를 쓰도록 <html>에
  // data-sidebar를 달고, 그 폭(--sidebar-w)은 CSS가 정해요(layout.css). 본문 폭은 그대로라서 가운데로 와요.
  // 넓은 화면에서의 접힘(브라우저에 기억해요). 좁은 화면에서는 늘 접힌 채 시작하고, 열어도 기억하지 않아요.
  const [wideCollapsed, setWideCollapsed] = useState(loadSidebarCollapsed);
  const [narrow, setNarrow] = useState(isNarrowNow);
  const [narrowOpen, setNarrowOpen] = useState(false);
  const sidebarCollapsed = narrow ? !narrowOpen : wideCollapsed;
  // 키보드 사용자가 접기·펼치기를 누르면 포커스가 사라진 버튼 대신 반대쪽 버튼으로 가게 기억해 둬요.
  const focusAfterToggle = useRef(null);

  useEffect(() => {
    let query;
    try {
      query = window.matchMedia(NARROW_QUERY);
    } catch {
      return undefined;
    }

    const onChange = () => {
      setNarrow(query.matches);
      setNarrowOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // 좁은 화면에서는 화면을 옮기면 겹쳐 열린 사이드바를 닫아요.
  const { pathname: currentPath } = useLocation();

  useEffect(() => {
    const label = titleFor(currentPath);
    document.title = label ? `${label} · FlowSpace` : "FlowSpace";
    return () => {
      document.title = "FlowSpace";
    };
  }, [currentPath]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNarrowOpen(false);
  }, [currentPath]);

  // 첫 화면이 그려지기 전에 표시를 달아서, 접어 둔 채 새로고침해도 펼쳐졌다가 접히는 깜빡임이 없어요.
  useLayoutEffect(() => {
    const root = document.documentElement;

    if (sidebarCollapsed) {
      root.dataset.sidebar = "collapsed";
    } else {
      delete root.dataset.sidebar;
    }

    // 이 레이아웃을 벗어나면(로그인 화면 등) 접힘 표시를 지워요.
    return () => {
      delete root.dataset.sidebar;
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    const target = focusAfterToggle.current;
    if (!target) return undefined;
    focusAfterToggle.current = null;

    const frame = requestAnimationFrame(() => {
      document.querySelector(target === "open" ? ".sidebarOpenBtn" : ".sidebarCollapseBtn")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [sidebarCollapsed]);

  // 겹쳐 열린 사이드바는 Esc로도 닫아요.
  useEffect(() => {
    if (!narrow || !narrowOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setNarrowOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [narrow, narrowOpen]);

  const changeSidebarCollapsed = (collapsed) => {
    focusAfterToggle.current = collapsed ? "open" : "collapse";

    if (narrow) {
      setNarrowOpen(!collapsed);
      return;
    }

    setWideCollapsed(collapsed);

    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // 저장소를 못 써도 접기·펼치기는 동작해요(다음에 열면 펼친 채로 시작할 뿐이에요).
    }
  };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();

  // 워크스페이스 목록을 아직 못 받았거나 실패했을 때는 사이드바·헤더를 그릴 수 없어요
  // (현재 워크스페이스가 있어야 이름·페이지를 보여줘요).
  if (!currentWorkspace) {
    return (
      <div style={{ margin: "auto", padding: 40, textAlign: "center" }} role="status">
        {/* 워크스페이스가 하나도 없는 새 사용자도 받은 초대를 수락할 수 있게 알림 종은 여기서도 보여요. */}
        <div style={{ position: "fixed", top: 18, right: 24 }}>
          <NotificationBell />
        </div>
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
              <button type="button" onClick={async () => {
                  if (await confirm({ title: "로그아웃", message: "로그아웃할까요?", confirmLabel: "로그아웃" })) logout();
                }}>
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
      {narrow && !sidebarCollapsed && (
        <div className="sidebarBackdrop" onClick={() => changeSidebarCollapsed(true)} aria-hidden="true" />
      )}
      <Sidebar
        navigation={navigation}
        pages={pagesInWorkspace}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        sprints={sidebarSprints}
        pagesReady={!pagesLoading && !pagesError}
        sprintsReady={!sprintDataLoading && !sprintDataError}
        onSwitchWorkspace={switchWorkspace}
        onCreatePage={createPage}
        onDeletePage={deletePage}
        onRestorePage={restorePage}
        onPermanentlyDeletePage={permanentlyDeletePage}
        onEmptyTrash={emptyTrash}
        onReorderTopLevelPages={reorderTopLevelPages}
        onOpenSettings={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapse={() => changeSidebarCollapsed(true)}
      />
      <main className={styles.main}>
        <Header
          members={members}
          workspaceId={currentWorkspace.id}
          sidebarCollapsed={sidebarCollapsed}
          onOpenSidebar={() => changeSidebarCollapsed(false)}
        />
        <ErrorBoundary resetKey={pathname}>
        {/* 화면 코드를 처음 받아오는 동안에도 사이드바·헤더는 그대로 두고 본문 자리만 비워 둬요(App.jsx에서 화면을 나눠서 불러와요). */}
        <Suspense fallback={<div role="status" style={{ padding: 40, textAlign: "center", color: "#7c879c" }}>불러오는 중이에요…</div>}>
        <Outlet
          context={{
            workspaceId: currentWorkspace.id,
            // 관리자 이상만 스프린트·칸반 상태 삭제 같은 되돌리기 어려운 관리 작업을 할 수 있어요.
            canManageWorkspace: isAdminOrOwner(currentWorkspace.role),
            pages,
            pagesInWorkspace,
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
            updateSprint,
            changeSprintStatus,
            deleteSprint,
            createTask,
            updateTask,
            deleteTasks,
            moveTaskOnBoard,
            toggleSubtask,
            addSubtasks,
            deleteSubtask,
            renameSubtask,
            setSubtaskAssignee,
            moveSubtask,
            createStatus,
            saveStatus,
            deleteStatus,
            reorderStatuses,
          }}
        />
        </Suspense>
        </ErrorBoundary>
      </main>
      {settingsOpen && (
        <WorkspaceSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </MemberProfileProvider>
  );
}
