import { Fragment, useState } from "react";
import * as Icons from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "../styles/classes.js";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

// 페이지 줄을 드래그할 때 dataTransfer에 심는 커스텀 MIME이에요. Firefox는
// dragstart에서 setData를 한 번도 안 부르면 드래그 자체를 시작하지 않아요.
const PAGE_DRAG_MIME = "application/x-flowspace-page";

// 컴포넌트 안에서 Icon을 정의하면 Sidebar가 렌더될 때마다 "새로운 컴포넌트"가 돼서
// 아이콘 DOM이 매번 지워졌다 다시 만들어져요 — 그러면 휴지통 화살표(chevron)의
// 회전 transition도 처음 상태에서 다시 시작해서 안 보였어요. 밖으로 빼서 같은
// 컴포넌트로 유지해요. 이름이 잘못되면(오타·아이콘 버전 차이) 앱이 죽지 않게
// 기본 아이콘으로 대신 그려요.
function Icon({ name, ...props }) {
  const C = Icons[name] ?? Icons.FileText;
  if (!C) return null;
  return <C strokeWidth={1.9} {...props} />;
}

export default function Sidebar({
  navigation,
  pages,
  workspaces,
  currentWorkspace,
  sprints = [],
  onSwitchWorkspace,
  onCreatePage,
  onDeletePage,
  onRestorePage,
  onPermanentlyDeletePage,
  onEmptyTrash,
  onReorderTopLevelPages,
  onOpenSettings,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /* ---------- Workspace ---------- */

  // 현재 워크스페이스와 목록은 WorkspaceProvider가 들고 있고(MainLayout이 props로
  // 내려줘요), 여기선 고르는 UI만 맡아요. 다른 워크스페이스로 바꾸면 홈으로 보내요 —
  // 안 그러면 이전 워크스페이스의 페이지(/pages/:id)가 화면에 그대로 남아요.
  const changeWorkspace = (id) => {
    if (id === currentWorkspace?.id) return;
    onSwitchWorkspace?.(id);
    navigate("/");
  };

  /* ---------- Navigation ---------- */

  const go = (label) => {
    if (label === "홈") navigate("/");
    if (label === "스프린트") navigate("/sprints");
    if (label === "칸반") navigate("/kanban");
    if (label === "캘린더") navigate("/calendar");
    if (label === "회고") navigate("/retrospectives");
  };

  // "/"일 때만 홈을 active로 잡아요. 원래는 마지막 조건이 무조건 "홈"이라
  // /pages/:pageId처럼 위 네 경로 중 어디에도 안 걸리는 페이지 상세
  // 화면에서도 홈이 같이 active가 됐었어요(페이지는 아래 "페이지" 목록의
  // isPageActive가 따로 표시하니까, 이땐 nav 쪽엔 아무것도 선택 안 돼야
  // 맞아요).
  const activeLabel = pathname === "/"
    ? "홈"
    : pathname.startsWith("/sprints")
      ? "스프린트"
      : pathname.startsWith("/kanban")
        ? "칸반"
        : pathname.startsWith("/calendar")
          ? "캘린더"
          : pathname.startsWith("/retrospectives")
            ? "회고"
            : null;

  /* ---------- Pages ---------- */
  // 사이드바에는 최상위 페이지만 보여줘요. 하위 페이지는 각 페이지
  // 안의 "하위 페이지" 목록에서 오가는 구조라, 트리로 펼치는 건 아직 안 함.
  // 휴지통으로 간 페이지는 여기 목록엔 안 보이고 아래 "휴지통" 섹션에서만
  // 보여요(중첩 여부와 상관없이 trashedAt이 있으면 전부 후보).
  const topLevelPages = pages.filter((page) => !page.parentPageId && !page.trashedAt);
  const trashedPages = pages.filter((page) => page.trashedAt);
  const isPageActive = (page) => pathname === `/pages/${page.id}`;

  const [trashOpen, setTrashOpen] = useState(false);

  // 최상위 페이지 순서를 마우스로 드래그해서 바꿔요 — 블록 에디터의
  // 블록 드래그(BlockEditor.jsx의 handleBlockDragOver/commitBlockDrop)와
  // 완전히 같은 패턴이에요: 호버 중인 페이지 줄의 2/3 지점을 기준으로
  // 앞/뒤를 정하고(dragOver마다 계산, 실제 배열 반영은 드롭할 때 한
  // 번만), 드래그 중인 페이지 바로 앞줄을 2/3 넘어서 호버하면 "다음
  // 줄"이 자기 자신이 되는 경우(의미 없는 목표)를 먼저 걸러요.
  const [dragPageId, setDragPageId] = useState(null);
  const [pageDropTarget, setPageDropTarget] = useState(null); // { beforePageId } | { beforePageId: null(맨 끝) }

  const handlePageDragOver = (hoveredPageId, isAfter) => {
    if (dragPageId === null || dragPageId === hoveredPageId) return;

    const hoveredIndex = topLevelPages.findIndex((p) => p.id === hoveredPageId);
    const nextPage = isAfter ? topLevelPages[hoveredIndex + 1] : null;
    const beforePageId = isAfter ? (nextPage ? nextPage.id : null) : hoveredPageId;

    if (beforePageId === dragPageId) {
      setPageDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    const fromIndex = topLevelPages.findIndex((p) => p.id === dragPageId);
    if (beforePageId === null) {
      if (fromIndex === topLevelPages.length - 1) {
        setPageDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    } else {
      const targetIndex = topLevelPages.findIndex((p) => p.id === beforePageId);
      if (targetIndex === fromIndex + 1) {
        setPageDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setPageDropTarget((prev) =>
      prev && prev.beforePageId === beforePageId ? prev : { beforePageId },
    );
  };

  const commitPageDrop = () => {
    if (dragPageId !== null && pageDropTarget) {
      const next = [...topLevelPages];
      const fromIndex = next.findIndex((p) => p.id === dragPageId);
      if (fromIndex !== -1) {
        const [moved] = next.splice(fromIndex, 1);
        if (pageDropTarget.beforePageId === null) {
          next.push(moved);
        } else {
          const toIndex = next.findIndex((p) => p.id === pageDropTarget.beforePageId);
          if (toIndex === -1) next.push(moved);
          else next.splice(toIndex, 0, moved);
        }
        onReorderTopLevelPages?.(next.map((p) => p.id));
      }
    }
    setDragPageId(null);
    setPageDropTarget(null);
  };

  // 드래그가 끝났을 때는 표시선·흐려진 줄만 걷어내는 정리만 해요. 순서는 줄(또는
  // 표시선) 위에서 drop이 일어났을 때만 commitPageDrop에서 바꾸니까, Esc로 취소했거나
  // 놓을 수 없는 곳에 놓아서 dropEffect가 "none"인 dragend는 아무것도 반영하지 않고
  // 정리만 하고 끝나요(dragend에서 순서를 확정하지 않는 게 핵심이에요).
  const handlePageDragEnd = () => {
    setDragPageId(null);
    setPageDropTarget(null);
  };

  const handleCreatePage = () => {
    const newPage = onCreatePage?.();
    if (newPage) navigate(`/pages/${newPage.id}`);
  };

  const handleDeletePage = (e, page) => {
    e.stopPropagation();
    const hasChildren = pages.some((p) => p.parentPageId === page.id);
    const confirmed = window.confirm(
      hasChildren
        ? "이 페이지를 삭제하면 하위 페이지도 모두 함께 휴지통으로 이동해요. 계속할까요?"
        : "이 페이지를 휴지통으로 이동할까요? 나중에 휴지통에서 복원할 수 있어요.",
    );
    if (!confirmed) return;

    // 지금 보고 있는 페이지가 삭제 대상이거나 그 하위 페이지라면
    // (재귀), 사라질 페이지에 그대로 남아있지 않도록 홈으로 보내요.
    const deletedIds = new Set([page.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of pages) {
        if (deletedIds.has(p.parentPageId) && !deletedIds.has(p.id)) {
          deletedIds.add(p.id);
          grew = true;
        }
      }
    }
    const activeMatch = pathname.match(/^\/pages\/(\d+)/);
    const activePageId = activeMatch ? Number(activeMatch[1]) : null;

    onDeletePage?.(page.id);
    if (activePageId !== null && deletedIds.has(activePageId)) {
      navigate("/");
    }
  };

  const handleRestorePage = (pageId) => {
    onRestorePage?.(pageId);
  };

  const handlePermanentlyDeletePage = (page) => {
    const hasChildren = pages.some((p) => p.parentPageId === page.id && p.trashedAt);
    const confirmed = window.confirm(
      hasChildren
        ? "이 페이지와 하위 페이지를 완전히 삭제할까요? 이 작업은 되돌릴 수 없어요."
        : "이 페이지를 완전히 삭제할까요? 이 작업은 되돌릴 수 없어요.",
    );
    if (!confirmed) return;
    onPermanentlyDeletePage?.(page.id);
  };

  const handleEmptyTrash = () => {
    if (trashedPages.length === 0) return;
    const confirmed = window.confirm(
      "휴지통에 있는 페이지를 모두 완전히 삭제할까요? 이 작업은 되돌릴 수 없어요.",
    );
    if (!confirmed) return;
    onEmptyTrash?.();
  };

  return (
    <aside className={styles.sidebar}>
      {/* ---------- Logo ---------- */}

      <FlowSpaceLogo onClick={() => navigate("/")} />

      {/* ---------- Workspace Switcher ---------- */}

      <WorkspaceSwitcher
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onChange={changeWorkspace}
      />

      {/* ---------- Navigation ---------- */}

      <nav>
        {navigation.map(([label, icon]) => (
          <button
            key={label}
            onClick={() => go(label)}
            className={`${styles.navItem} ${
              label === activeLabel ? styles.selected : ""
            }`}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Pages ---------- */}

      <div className={styles.pageArea}>
        <div className={styles.divider} />

        <p>페이지</p>

        {topLevelPages.map((page) => (
          <Fragment key={page.id}>
            {pageDropTarget?.beforePageId === page.id && (
              <div
                className="page-drop-indicator"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  commitPageDrop();
                }}
              />
            )}

            <div
              className={`${styles.navItem} pageNavRow ${
                isPageActive(page) ? styles.selected : ""
              } ${dragPageId === page.id ? "dragging" : ""}`}
              onDragEnter={(e) => e.preventDefault()}
              onDragOver={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientY - rect.top) / rect.height;
                handlePageDragOver(page.id, ratio >= 2 / 3);
              }}
              onDrop={(e) => {
                e.preventDefault();
                commitPageDrop();
              }}
            >
              <button
                type="button"
                className="pageNavRow__grip"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData(PAGE_DRAG_MIME, String(page.id));
                  setDragPageId(page.id);
                }}
                onDragEnd={handlePageDragEnd}
                title="드래그해서 순서 변경"
                aria-label={`${page.title || "제목 없음"} 순서 변경`}
              >
                <Icon name="GripVertical" size={14} />
              </button>

              <button
                type="button"
                className="pageNavRow__link"
                onClick={() => navigate(`/pages/${page.id}`)}
              >
                {page.icon ? (
                  <span style={{ fontSize: 16, lineHeight: 1, width: 18, textAlign: "center" }}>
                    {page.icon}
                  </span>
                ) : (
                  <Icon name="FileText" />
                )}
                <span>{page.title || "제목 없음"}</span>
              </button>

              <button
                type="button"
                className="pageNavRow__delete"
                onClick={(e) => handleDeletePage(e, page)}
                title="페이지 삭제"
                aria-label={`${page.title || "제목 없음"} 삭제`}
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </Fragment>
        ))}

        {pageDropTarget?.beforePageId === null && (
          <div
            className="page-drop-indicator"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              commitPageDrop();
            }}
          />
        )}

        <button
          className={`${styles.navItem} ${styles.newPage}`}
          onClick={handleCreatePage}
        >
          <Icon name="Plus" />
          <span>새 페이지</span>
        </button>

        {/* ---------- Trash ---------- */}
        {/* 페이지 삭제가 소프트 삭제(trashedAt)로 바뀌면서 생긴 복구 창구예요.
            휴지통이 비어있으면 아예 안 보이게 해서 평소 사이드바를 어지럽히지
            않아요. */}
        {trashedPages.length > 0 && (
          <div className="trashSection">
            <button
              type="button"
              className="trashSection__toggle"
              onClick={() => setTrashOpen((prev) => !prev)}
              aria-expanded={trashOpen}
              aria-label={`휴지통, 페이지 ${trashedPages.length}개`}
            >
              <Icon name="Trash2" size={15} />
              <span>휴지통</span>
              <b>{trashedPages.length}</b>
              <Icon
                name="ChevronRight"
                size={14}
                className={`trashSection__chevron ${trashOpen ? "open" : ""}`}
              />
            </button>

            {trashOpen && (
              <div className="trashSection__list">
                {trashedPages.map((page) => (
                  <div key={page.id} className="trashRow">
                    <span className="trashRow__title">
                      {page.icon ? (
                        <span style={{ fontSize: 14, lineHeight: 1, width: 16, textAlign: "center" }}>
                          {page.icon}
                        </span>
                      ) : (
                        <Icon name="FileText" size={14} />
                      )}
                      <span>{page.title || "제목 없음"}</span>
                    </span>

                    <button
                      type="button"
                      className="trashRow__action"
                      onClick={() => handleRestorePage(page.id)}
                      title="복원"
                      aria-label={`${page.title || "제목 없음"} 복원`}
                    >
                      <Icon name="RotateCcw" size={13} />
                    </button>

                    <button
                      type="button"
                      className="trashRow__action trashRow__action--danger"
                      onClick={() => handlePermanentlyDeletePage(page)}
                      title="완전히 삭제"
                      aria-label={`${page.title || "제목 없음"} 완전히 삭제`}
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="trashSection__empty"
                  onClick={handleEmptyTrash}
                >
                  휴지통 비우기
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- Sprint ---------- */}

        <div className="sidebarSprints">
          <div className="sidebarSprintDivider" />

          <p>현재 스프린트</p>

          {sprints.slice(0, 3).map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => navigate(`/sprints/${sprint.id}`)}
            >
              <i className={sprint.color} />

              <span>{sprint.name}</span>

              <b>
                {sprint.status === "ACTIVE"
                  ? "진행 중"
                  : sprint.status === "PLANNING"
                    ? "계획됨"
                    : "완료"}
              </b>
            </button>
          ))}

          <button className="allSprints" onClick={() => navigate("/sprints")}>
            <Icon name="Plus" size={16} />
            <span>모든 스프린트 보기</span>
          </button>
        </div>
      </div>

      {/* ---------- Workspace Settings ---------- */}
      {/* 온라인 팀원 위젯이 있던 자리예요 — 헤더로 옮기고 대신 워크스페이스
          단위 설정으로 들어가는 진입점을 둬요. 처음엔 별도 페이지로
          만들었는데, 노션처럼 지금 보던 화면 위에 뜨는 모달이 더
          자연스럽다고 하셔서 라우트 이동 대신 모달을 열게 바꿨어요
          (열림 상태는 MainLayout이 들고 있어요). 지금은 화면 껍데기만
          있고, 실제 설정 항목은 API 연결 때 채워요. 위쪽 WorkspaceSwitcher
          (워크스페이스 전환)와는 역할이 달라요. */}

      <button
        type="button"
        className={styles.workspaceSettingsBtn}
        onClick={onOpenSettings}
      >
        <Icon name="Settings" />
        <span>워크스페이스 설정</span>
      </button>
    </aside>
  );
}
