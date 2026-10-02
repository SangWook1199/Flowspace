import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, User, UserX, X } from "lucide-react";

import WorkspaceContext from "../context/WorkspaceContext";
import ProfilePanel from "../components/account/ProfilePanel";
import PasswordPanel from "../components/account/PasswordPanel";
import WithdrawPanel from "../components/account/WithdrawPanel";

import "../styles/workspace-settings.css";
import "../styles/account-settings.css";

const TABS = [
  { key: "profile", label: "프로필", Icon: User },
  { key: "password", label: "비밀번호", Icon: KeyRound },
  { key: "withdraw", label: "회원 탈퇴", Icon: UserX },
];

// 헤더의 프로필 메뉴에서 여는 "내 계정" 설정이에요. 워크스페이스 설정과 같은 모달 모양을 그대로 써요.
// 배경을 클릭하거나 Esc를 누르면 닫혀요.
export default function AccountSettingsModal({ onClose }) {
  // 이름·사진을 바꾸면 멤버 목록에도 바로 반영되게 다시 불러와요(워크스페이스 밖 화면이면 건너뛰어요).
  const reloadMembers = useContext(WorkspaceContext)?.reloadMembers;

  const [tab, setTab] = useState("profile");

  const cardRef = useRef(null);
  const closeRef = useRef(null);

  // onClose는 매 렌더마다 새로 만들어질 수 있어서, 리스너는 한 번만 달고 최신 값은 ref로 읽어요.
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
          'button:not([disabled]), [href], input:not([disabled]):not([hidden]), select, textarea, [tabindex]:not([tabindex="-1"])',
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

  // 열리면 포커스를 모달 안으로 옮기고, 닫힐 때 원래 누르던 곳으로 돌려줘요.
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

  // 헤더 안에서 열리지만, 헤더의 스타일(겹침 순서 등)에 영향받지 않게 body에 직접 그려요.
  return createPortal(
    <div className="workspaceSettingsBackdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        className="workspaceSettingsModal accountSettingsModal"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accountSettingsTitle"
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

        <nav className="wsSettings__nav" aria-label="내 계정 설정 메뉴">
          <h1 id="accountSettingsTitle">내 계정</h1>

          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`wsSettings__tab ${tab === key ? "active" : ""} ${key === "withdraw" ? "last" : ""}`}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="wsSettings__body">
          {tab === "profile" && <ProfilePanel onSaved={() => reloadMembers?.()} />}
          {tab === "password" && <PasswordPanel />}
          {tab === "withdraw" && <WithdrawPanel />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
