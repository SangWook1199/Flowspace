import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import MemberProfileContext from "./MemberProfileContext";
import { useWorkspace } from "./WorkspaceContext";
import { useAuth } from "./useAuth";
import { getMemberProfile } from "../api/workspaces";
import { getErrorMessage } from "../utils/apiError";
import MemberProfileCard from "../components/common/MemberProfileCard";

const CARD_WIDTH = 320;
const GAP = 8;
const MARGIN = 12;

// 멤버 프로필 카드를 한 곳에서 띄워요. 아바타·이름·멘션 어디서든 useMemberProfile()의 open(userId, 눌린 요소)를 부르면
// 그 요소 옆에 카드가 떠요. 같은 사람을 다시 누르거나, 바깥을 누르거나, Esc를 누르면 닫혀요.
export function MemberProfileProvider({ children }) {
  const { currentWorkspace, members } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [target, setTarget] = useState(null); // { userId, rect }
  const [state, setState] = useState({ userId: null, profile: null, error: null });
  const [position, setPosition] = useState(null);
  const cardRef = useRef(null);

  const workspaceId = currentWorkspace?.id ?? null;
  const myId = user?.id ?? user?.userId ?? null;

  const close = useCallback(() => setTarget(null), []);

  const open = useCallback((userId, anchor) => {
    if (userId == null || !anchor?.getBoundingClientRect) return;

    setTarget((current) => {
      if (current?.userId === userId && current.anchor === anchor) return null; // 같은 곳을 다시 누르면 닫아요
      return { userId, anchor, rect: anchor.getBoundingClientRect() };
    });
  }, []);

  // 카드가 열릴 때마다 서버에서 최신 프로필을 받아와요(늦게 온 이전 응답은 무시해요).
  useEffect(() => {
    if (!target || workspaceId == null) return undefined;

    let cancelled = false;

    getMemberProfile(workspaceId, target.userId)
      .then((profile) => {
        if (!cancelled) setState({ userId: target.userId, profile, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ userId: target.userId, profile: null, error: getErrorMessage(err, "프로필을 불러오지 못했어요.") });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [target, workspaceId]);

  // 눌린 요소 옆에 놓되 화면 밖으로 나가지 않게: 가로는 화면 안으로 밀어 넣고, 아래가 모자라면 위로 띄워요.
  useLayoutEffect(() => {
    if (!target) {
      setPosition(null);
      return;
    }

    const height = cardRef.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(MARGIN, target.rect.left), Math.max(MARGIN, window.innerWidth - CARD_WIDTH - MARGIN));
    const below = target.rect.bottom + GAP;
    const top =
      below + height > window.innerHeight - MARGIN && target.rect.top - GAP - height > MARGIN
        ? target.rect.top - GAP - height
        : below;

    setPosition({ left, top });
  }, [target, state]);

  // 열려 있는 동안만 바깥 클릭·Esc·스크롤·창 크기 변화를 감지해서 닫아요.
  useEffect(() => {
    if (!target) return undefined;

    const onPointerDown = (e) => {
      if (cardRef.current?.contains(e.target) || target.anchor?.contains(e.target)) return;
      close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        close();
        target.anchor?.focus?.();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [target, close]);

  const value = useMemo(() => ({ open }), [open]);

  const base = target ? members.find((m) => m.id === target.userId) : null;
  const current = state.userId === target?.userId ? state : { profile: null, error: null };

  return (
    <MemberProfileContext.Provider value={value}>
      {children}

      {target &&
        base &&
        createPortal(
          <MemberProfileCard
            ref={cardRef}
            base={base}
            profile={current.profile}
            loading={!current.profile && !current.error}
            error={current.error}
            isMe={target.userId === myId}
            style={{ left: position?.left ?? -9999, top: position?.top ?? -9999, width: CARD_WIDTH }}
            onOpenTask={(task) => {
              close();
              if (task.link) navigate(task.link);
            }}
          />,
          document.body,
        )}
    </MemberProfileContext.Provider>
  );
}
