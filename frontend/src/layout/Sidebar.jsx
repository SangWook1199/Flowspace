import { useState } from "react";
import * as Icons from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "../styles/classes.js";
import { sprints } from "../mock/sprints";
import workspaceMock from "../mock/workspaceMock";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";

export default function Sidebar({ navigation, pages, members, onCreatePage, onDeletePage }) {
  const Icon = ({ name, ...props }) => {
    const C = Icons[name];
    return <C strokeWidth={1.9} {...props} />;
  };

  const navigate = useNavigate();
  const { pathname } = useLocation();

  /* ---------- Workspace ---------- */

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    workspaceMock.currentWorkspaceId,
  );

  const currentWorkspace = workspaceMock.workspaces.find(
    (w) => w.id === currentWorkspaceId,
  );

  const changeWorkspace = (id) => {
    setCurrentWorkspaceId(id);
    setWorkspaceOpen(false);

    // TODO : Spring API
    // workspaceApi.changeWorkspace(id);
  };

  /* ---------- Navigation ---------- */

  const go = (label) => {
    if (label === "홈") navigate("/");
    if (label === "스프린트") navigate("/sprints");
    if (label === "칸반") navigate("/kanban");
    if (label === "캘린더") navigate("/calendar");
    if (label === "회고") navigate("/retrospectives");
  };

  const activeLabel = pathname.startsWith("/sprints")
    ? "스프린트"
    : pathname.startsWith("/kanban")
      ? "칸반"
      : pathname.startsWith("/calendar")
        ? "캘린더"
        : pathname.startsWith("/retrospectives")
          ? "회고"
          : "홈";

  /* ---------- Pages ---------- */
  // 사이드바에는 최상위 페이지만 보여줘요. 하위 페이지는 각 페이지
  // 안의 "하위 페이지" 목록에서 오가는 구조라, 트리로 펼치는 건 아직 안 함.
  const topLevelPages = pages.filter((page) => !page.parentPageId);
  const isPageActive = (page) => pathname === `/pages/${page.id}`;

  const handleCreatePage = () => {
    const newPage = onCreatePage?.();
    if (newPage) navigate(`/pages/${newPage.id}`);
  };

  const handleDeletePage = (e, page) => {
    e.stopPropagation();
    const hasChildren = pages.some((p) => p.parentPageId === page.id);
    const confirmed = window.confirm(
      hasChildren
        ? "이 페이지를 삭제하면 하위 페이지도 모두 함께 삭제돼요. 계속할까요?"
        : "이 페이지를 삭제할까요?",
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

  return (
    <aside className={styles.sidebar}>
      {/* ---------- Logo ---------- */}

      <FlowSpaceLogo />

      {/* ---------- Workspace Switcher ---------- */}

      <div className="workspaceSwitcher">
        <button
          className={styles.workspace}
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
        >
          <span
            className={styles.workspaceIcon}
            style={{
              background: currentWorkspace.color,
              color: "#fff", // 추가
            }}
          >
            {currentWorkspace.initials}
          </span>
          <span>
            <b>{currentWorkspace.name}</b>
            <small>워크스페이스</small>
          </span>

          <Icon
            name="ChevronDown"
            size={18}
            className={workspaceOpen ? "rotate" : ""}
          />
        </button>

        {workspaceOpen && (
          <div className="workspaceDropdown">
            <p>내 워크스페이스</p>

            {workspaceMock.workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className="workspaceItem"
                onClick={() => changeWorkspace(workspace.id)}
              >
                <span
                  className="workspaceAvatar"
                  style={{ background: workspace.color }}
                >
                  {workspace.initials}
                </span>

                <span className="workspaceName">{workspace.name}</span>

                {workspace.id === currentWorkspaceId && (
                  <Icon name="Check" size={16} className="workspaceCheck" />
                )}
              </button>
            ))}

            <div className="workspaceDivider" />

            <button
              className="workspaceCreate"
              onClick={() => {
                setWorkspaceOpen(false);
                navigate("/workspace/create");
              }}
            >
              <Icon name="PlusCircle" size={18} />
              <span>새 워크스페이스 만들기</span>
            </button>
          </div>
        )}
      </div>

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
          <div
            className={`${styles.navItem} pageNavRow ${
              isPageActive(page) ? styles.selected : ""
            }`}
            key={page.id}
          >
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
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        ))}

        <button
          className={`${styles.navItem} ${styles.newPage}`}
          onClick={handleCreatePage}
        >
          <Icon name="Plus" />
          <span>새 페이지</span>
        </button>

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

      {/* ---------- Online Members ---------- */}

      <div className={styles.memberMini}>
        <small>
          <em /> 온라인 팀원 2 / 4
        </small>

        <div>
          {members.map((member) => (
            <span
              key={member.name}
              className={`${styles.avatar} ${styles[member.tone]}`}
            >
              {member.initial}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
