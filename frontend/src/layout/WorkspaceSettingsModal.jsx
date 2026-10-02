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
  const closeRef = useRef(null);

  // onClose는 부모가 매 렌더마다 새로 만들어 넘기는 화살표 함수라, 이걸 effect 의존성에
  // 넣으면 렌더마다 리스너를 다시 달고 떼요. ref에 최신 값을 담아 두고 리스너는 한 번만 달아요.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      // 모달이 떠 있는 동안 Tab이 모달 밖(뒤쪽 화면)으로 새지 않게 모달 안에서만 돌려요.
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 열리면 포커스를 모달 안(닫기 버튼)으로 옮기고, 닫힐 때 원래 누르던 버튼(사이드바의
  // 설정 버튼)으로 되돌려줘요 — 안 그러면 키보드 사용자는 모달이 닫힌 뒤 처음부터 다시
  // Tab을 눌러 찾아가야 해요.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

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
      <div
        className="workspaceSettingsModal"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspaceSettingsTitle"
      >
        <button
          type="button"
          className="workspaceSettingsClose"
          ref={closeRef}
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        <div className="workspaceSettingsEmpty">
          <Settings size={38} strokeWidth={1.6} />
          <h1 id="workspaceSettingsTitle">워크스페이스 설정</h1>
          <p>
            워크스페이스 이름 변경, 멤버 관리, 권한 설정 같은 기능이 이곳에
            들어올 예정이에요. 지금은 진입점만 먼저 만들어뒀어요.
          </p>
        </div>
      </div>
    </div>
  );
}
