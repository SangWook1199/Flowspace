import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

// 예전엔 Sidebar.jsx 안에 워크스페이스 드롭다운을 통째로 다시 구현해놔서,
// 이 컴포넌트는 만들어놓고 아무도 안 쓰는 죽은 코드였어요(클래스명도
// kebab-case라 layout.css의 실제 스타일과 안 맞았고요). 게다가 그
// 인라인 버전은 표의 팝오버(PopoverPortal)와 달리 바깥을 클릭해도 안
// 닫혔어요. 이번에 Sidebar.jsx가 이 컴포넌트를 실제로 쓰도록 바꾸면서,
// 클래스명은 layout.css에 이미 있는 camelCase 이름 그대로 맞추고
// 바깥 클릭 · Esc로 닫히는 것도 여기서 한 번만 구현해요.
export default function WorkspaceSwitcher({ currentWorkspace, workspaces, onChange }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="workspaceSwitcher" ref={rootRef}>
      <button
        type="button"
        className="workspace"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="workspaceIcon"
          style={{ background: currentWorkspace.color, color: "#fff" }}
        >
          {currentWorkspace.initials}
        </span>

        <span>
          <b>{currentWorkspace.name}</b>
          <small>워크스페이스</small>
        </span>

        <ChevronDown size={18} className={open ? "rotate" : ""} />
      </button>

      {open && (
        <div className="workspaceDropdown">
          <p>내 워크스페이스</p>

          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              className="workspaceItem"
              onClick={() => {
                onChange(workspace.id);
                setOpen(false);
              }}
            >
              <span
                className="workspaceAvatar"
                style={{ background: workspace.color }}
              >
                {workspace.initials}
              </span>

              <span className="workspaceName">{workspace.name}</span>

              {workspace.id === currentWorkspace.id && (
                <Check size={16} className="workspaceCheck" />
              )}
            </button>
          ))}

          <div className="workspaceDivider" />

          <button
            type="button"
            className="workspaceCreate"
            onClick={() => {
              setOpen(false);
              navigate("/workspace/create");
            }}
          >
            <PlusCircle size={18} />
            <span>새 워크스페이스 만들기</span>
          </button>
        </div>
      )}
    </div>
  );
}
