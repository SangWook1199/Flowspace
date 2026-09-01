import { useState } from "react";
import { ChevronDown, Check, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WorkspaceSwitcher({
  currentWorkspace,
  workspaces,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="workspace-switcher">
      <button
        className="workspace-switcher__button"
        onClick={() => setOpen(!open)}
      >
        <div
          className="workspace-avatar"
          style={{ background: currentWorkspace.color }}
        >
          {currentWorkspace.initials}
        </div>

        <div className="workspace-info">
          <strong>{currentWorkspace.name}</strong>
          <span>워크스페이스</span>
        </div>

        <ChevronDown
          size={18}
          className={open ? "rotate" : ""}
        />
      </button>

      {open && (
        <div className="workspace-dropdown">
          <span className="workspace-dropdown__title">
            내 워크스페이스
          </span>

          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              className="workspace-item"
              onClick={() => {
                onChange(workspace.id);
                setOpen(false);
              }}
            >
              <div
                className="workspace-avatar small"
                style={{ background: workspace.color }}
              >
                {workspace.initials}
              </div>

              <span>{workspace.name}</span>

              {workspace.id === currentWorkspace.id && (
                <Check size={16} className="workspace-check" />
              )}
            </button>
          ))}

          <div className="workspace-divider" />

          <button
            className="workspace-create"
            onClick={() => navigate("/workspace/create")}
          >
            <PlusCircle size={18} />
            새 워크스페이스 만들기
          </button>
        </div>
      )}
    </div>
  );
}