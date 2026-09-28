import { useEffect, useRef } from "react";
import { Settings, X } from "lucide-react";

import "../styles/workspace-settings.css";

// 처음엔 별도 라우트(페이지)로 만들었는데, 노션 설정처럼 지금 보던 화면
// 위에 뜨는 모달이 더 자연스럽다고 하셔서 바꿨어요. 배경을 클릭하거나
// Esc를 누르면 닫혀요 — WorkspaceSwitcher 드롭다운에 썼던 것과 같은
// 바깥 클릭 패턴이에요. 내용은 아직 껍데기고, 실제 설정 항목은 API
// 연결 때 채워요.
export default function WorkspaceSettingsModal({ onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropMouseDown = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="workspaceSettingsBackdrop"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="workspaceSettingsModal" ref={cardRef}>
        <button
          type="button"
          className="workspaceSettingsClose"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        <div className="workspaceSettingsEmpty">
          <Settings size={38} strokeWidth={1.6} />
          <h1>워크스페이스 설정</h1>
          <p>
            워크스페이스 이름 변경, 멤버 관리, 권한 설정 같은 기능이 이곳에
            들어올 예정이에요. 지금은 진입점만 먼저 만들어뒀어요.
          </p>
        </div>
      </div>
    </div>
  );
}
