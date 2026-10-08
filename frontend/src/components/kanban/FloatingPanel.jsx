import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 카드의 버튼(anchor) 근처에 뜨는 작은 팝업이에요. 보드·컬럼이 스크롤돼도 잘리지 않게 body에 그려요.
// 바깥을 누르거나 Esc를 누르거나 스크롤하면 닫혀요(anchor를 다시 누르는 건 부른 쪽이 토글해요).
export default function FloatingPanel({ anchor, onClose, width = 200, className = "", label, children }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  // 버튼 아래(공간이 모자라면 위)에, 오른쪽 끝을 맞추되 화면 안에 들어오게 놓아요.
  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight ?? 160;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left });
  }, [anchor, width]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchor?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e) => {
      if (!panelRef.current?.contains(e.target)) onClose();
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

  return createPortal(
    <div
      ref={panelRef}
      className={`floatingPanel ${className}`}
      style={{ top: pos.top, left: pos.left, width }}
      role="dialog"
      aria-label={label}
    >
      {children}
    </div>,
    document.body,
  );
}
