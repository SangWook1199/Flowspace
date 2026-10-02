import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, Trash2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/useAuth";
import GeneralPanel from "../components/workspace/settings/GeneralPanel";
import MembersPanel from "../components/workspace/settings/MembersPanel";
import DangerPanel from "../components/workspace/settings/DangerPanel";

import "../styles/workspace-settings.css";

// 왼쪽 탭은 "위험 구역" 같은 겁주는 이름 대신 하는 일 그대로 불러요(소유자=삭제, 멤버=나가기).
// 경고 톤(붉은색·"위험 구역" 제목)은 오른쪽 패널 안에서만 써요.
const buildTabs = (isOwner) => [
  { key: "general", label: "일반", Icon: Settings },
  { key: "members", label: "멤버", Icon: Users },
  isOwner
    ? { key: "danger", label: "워크스페이스 삭제", Icon: Trash2 }
    : { key: "danger", label: "워크스페이스 나가기", Icon: LogOut },
];

// 처음엔 별도 라우트(페이지)로 만들었는데, 노션 설정처럼 지금 보던 화면
// 위에 뜨는 모달이 더 자연스럽다고 하셔서 바꿨어요. 배경을 클릭하거나
// Esc를 누르면 닫혀요 — WorkspaceSwitcher 드롭다운에 썼던 것과 같은
// 바깥 클릭 패턴이에요. 왼쪽 탭(일반 · 멤버 · 위험 구역)으로 패널을 바꿔요.
// 수정·추방·소유권 이전·삭제는 소유자만 할 수 있어요(서버도 같은 규칙으로 막아요).
export default function WorkspaceSettingsModal({ onClose }) {
  const {
    currentWorkspace,
    workspaces,
    members,
    updateCurrentWorkspace,
    inviteToCurrentWorkspace,
    removeMemberFromCurrentWorkspace,
    transferCurrentOwnership,
    leaveCurrentWorkspace,
    deleteCurrentWorkspace,
  } = useWorkspace();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth?.user?.id ?? auth?.user?.userId ?? null;

  const [tab, setTab] = useState("general");
  const isOwner = currentWorkspace?.role === "OWNER";

  // 나가기·삭제가 끝나면 다른 워크스페이스로 옮겨가니까, 모달을 닫고 홈으로 보내요.
  const finishLeaving = async (action) => {
    await action();
    onClose();
    navigate("/");
  };

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
        // 이모지 선택창이 떠 있으면 그 창만 닫혀요. 선택창의 검색칸에서 누른 Esc는 React가 먼저
        // 선택창을 닫아버려서(DOM에서 사라져서) 아래 querySelector로는 못 찾으니, 누른 곳이
        // 선택창 안이었는지(e.target)도 같이 봐요.
        if (
          e.target?.closest?.(".page-detail__icon-picker") ||
          cardRef.current?.querySelector(".page-detail__icon-picker")
        ) {
          return;
        }
        onCloseRef.current();
        return;
      }

      // 모달이 떠 있는 동안 Tab이 모달 밖(뒤쪽 화면)으로 새지 않게 모달 안에서만 돌려요.
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
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

        <nav className="wsSettings__nav" aria-label="워크스페이스 설정 메뉴">
          <h1 id="workspaceSettingsTitle">워크스페이스 설정</h1>

          {buildTabs(isOwner).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`wsSettings__tab ${tab === key ? "active" : ""} ${key === "danger" ? "last" : ""}`}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="wsSettings__body">
          {tab === "general" && (
            <GeneralPanel
              key={currentWorkspace.id}
              workspace={currentWorkspace}
              isOwner={isOwner}
              onSave={updateCurrentWorkspace}
            />
          )}

          {tab === "members" && (
            <MembersPanel
              workspaceId={currentWorkspace?.id}
              members={members}
              currentUserId={currentUserId}
              isOwner={isOwner}
              onInvite={inviteToCurrentWorkspace}
              onRemove={removeMemberFromCurrentWorkspace}
              onTransfer={transferCurrentOwnership}
            />
          )}

          {tab === "danger" && (
            <DangerPanel
              workspace={currentWorkspace}
              isOwner={isOwner}
              isOnlyWorkspace={workspaces.length <= 1}
              onLeave={() => finishLeaving(leaveCurrentWorkspace)}
              onDelete={() => finishLeaving(deleteCurrentWorkspace)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
