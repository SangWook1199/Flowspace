import { useState } from "react";
import * as Icons from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "../styles/classes.js";
import { sprints } from "../mock/sprints";
import workspaceMock from "../mock/workspaceMock";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";

export default function Sidebar({ navigation, pages, members }) {
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
            style={{ background: currentWorkspace.color }}
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

        {pages.map((page) => (
          <button className={styles.navItem} key={page}>
            <Icon name="FileText" />
            <span>{page}</span>
          </button>
        ))}

        <button className={`${styles.navItem} ${styles.newPage}`}>
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
