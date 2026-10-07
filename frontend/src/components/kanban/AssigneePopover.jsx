import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import UserAvatar from "../sprint/UserAvatar";

const POPUP_WIDTH = 260;
const POPUP_MAX_HEIGHT = 320;

// 칸반 카드의 담당자 영역을 눌렀을 때 뜨는 간편 배정 팝업이에요.
// 맨 위에 "나에게 할당"이 있고, 그 아래에 멤버 목록이 있어요(이름·이메일로 검색, 여러 명 선택 가능).
// anchor: 눌린 담당자 영역 요소, value: 지금 담당자 목록, meId: 내 사용자 id, onChange(새 담당자 목록)
export default function AssigneePopover({ anchor, members = [], value = [], meId, onChange, onClose }) {
  const popRef = useRef(null);
  const [keyword, setKeyword] = useState("");
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  const selectedIds = new Set(value.map((user) => user.id));
  const me = members.find((member) => member.id === meId) ?? null;

  // 카드를 가리지 않게 담당자 영역 아래(공간이 모자라면 위)에, 화면 안에 들어오도록 놓아요.
  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const height = popRef.current?.offsetHeight ?? POPUP_MAX_HEIGHT;
    const left = Math.min(Math.max(8, rect.right - POPUP_WIDTH), window.innerWidth - POPUP_WIDTH - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left });
  }, [anchor, keyword]);

  // 바깥을 누르거나 Esc를 누르면 닫아요(담당자 영역을 다시 누르는 건 카드 쪽에서 토글해요).
  useEffect(() => {
    const onPointerDown = (e) => {
      if (popRef.current?.contains(e.target) || anchor?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    // 보드가 스크롤되면 위치가 어긋나니 닫아요.
    const onScroll = (e) => {
      if (!popRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchor, onClose]);

  const toggle = (member) => {
    onChange(selectedIds.has(member.id) ? value.filter((user) => user.id !== member.id) : [...value, member]);
  };

  const query = keyword.trim().toLowerCase();
  const matches = (member) =>
    !query || `${member.name ?? ""} ${member.email ?? ""}`.toLowerCase().includes(query);
  const others = useMemo(
    () => members.filter((member) => member.id !== meId && matches(member)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, meId, query],
  );
  const showMe = me && matches(me);

  return createPortal(
    <div
      ref={popRef}
      className="assigneePop"
      style={{ top: pos.top, left: pos.left, width: POPUP_WIDTH }}
      role="dialog"
      aria-label="담당자 배정"
    >
      <input
        autoFocus
        className="assigneePop__search"
        placeholder="사용자 검색"
        aria-label="사용자 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <ul className="assigneePop__list" role="listbox" aria-multiselectable="true">
        {showMe && (
          <li role="option" aria-selected={selectedIds.has(me.id)}>
            <button type="button" onClick={() => toggle(me)}>
              <UserAvatar user={me} />
              <span className="assigneePop__text">
                <b>{me.name}</b>
                {me.email && <em>{me.email}</em>}
              </span>
              {selectedIds.has(me.id) && <Check size={15} />}
            </button>
          </li>
        )}

        {others.map((member) => (
          <li key={member.id} role="option" aria-selected={selectedIds.has(member.id)}>
            <button type="button" onClick={() => toggle(member)}>
              <UserAvatar user={member} />
              <span className="assigneePop__text">
                <b>{member.name}</b>
                {member.email && <em>{member.email}</em>}
              </span>
              {selectedIds.has(member.id) && <Check size={15} />}
            </button>
          </li>
        ))}

        {!showMe && others.length === 0 && <li className="assigneePop__empty">일치하는 멤버가 없어요.</li>}
      </ul>
    </div>,
    document.body,
  );
}
