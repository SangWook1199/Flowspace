import { useLayoutEffect, useRef, useState } from "react";
import { filterBlockTypes } from "../lib/blockTypes.js";

/* ================= SlashMenu ================= */

export default function SlashMenu({ query, options, activeIndex, onHoverIndex, onSelect }) {
  const filtered = filterBlockTypes(options, query);
  const menuRef = useRef(null);
  const [flipUp, setFlipUp] = useState(false);

  // 화면 아래쪽 블록에서 열었을 때 메뉴가 화면 밖으로 잘리지 않게, 아래 공간이 모자라고 위쪽이 더
  // 넓으면 블록 위로 뒤집어 열어요. 위치 기준(offsetParent)은 뒤집기 전후로 같아서 깜빡이지 않아요.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = menu?.offsetParent;
    if (!menu || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const need = Math.min(menu.scrollHeight, 320) + 12;
    const below = window.innerHeight - rect.bottom;
    setFlipUp(below < need && rect.top > below);
  }, [filtered.length]);

  // ↑/↓로 후보를 옮길 때 선택된 항목이 메뉴 스크롤 안에 항상 보이게 따라가요(페이지는 안 움직여요).
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const item = menu?.querySelector("button.active");
    if (!menu || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < menu.scrollTop + 6) menu.scrollTop = Math.max(0, top - 6);
    else if (bottom > menu.scrollTop + menu.clientHeight - 6) menu.scrollTop = bottom - menu.clientHeight + 6;
  }, [activeIndex, filtered.length]);

  const cls = `block-slash-menu${flipUp ? " block-slash-menu--up" : ""}`;
  // (role은 아래 각 렌더에서 listbox/option으로 달아요)

  if (filtered.length === 0) {
    return (
      <div className={cls} ref={menuRef}>
        <p className="block-slash-empty">일치하는 블록이 없어요.</p>
      </div>
    );
  }

  return (
    <div className={cls} ref={menuRef} role="listbox" aria-label="블록 종류">
      {filtered.map(({ type, label, icon: Icon, desc }, index) => (
        <button
          key={type}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={index === activeIndex ? "active" : ""}
          onMouseEnter={() => onHoverIndex?.(index)}
          // onMouseDown으로 blur보다 먼저 처리되게 한다
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(type);
          }}
        >
          <Icon size={16} />
          <div>
            <strong>{label}</strong>
            <span>{desc}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
