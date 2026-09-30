import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, Strikethrough, Code2, Link2, ChevronDown } from "lucide-react";

/* ================= SelectionToolbar =================
   요청: "인라인 서식" — 노션처럼 텍스트를 드래그해서 선택하면 그 위에
   뜨는 서식 툴바예요. BlockEditor.jsx가 document의 selectionchange를
   들어서 지금 선택 영역의 화면 좌표(rect)를 계산해 내려주면, 여기선
   그 좌표 바로 위(공간이 없으면 아래로 뒤집어서)에 document.body로
   포털링해서 그려요 — PopoverPortal.jsx와 똑같은 이유로(카드의
   overflow:hidden에 잘리면 안 되니까) 포털을 썼어요.

   data-popover-portal 마커도 PopoverPortal과 똑같이 달아요 —
   BlockEditor.jsx의 handleSelectionMouseDown/handleOutsideMouseDown이
   이미 "이 마커 달린 포털 안 클릭은 블록(여러 개 선택) 상태를 안
   건드린다"고 걸러주고 있어서, 새로 만드는 이 툴바도 그 예외를 그대로
   같이 타요(따로 처리를 안 추가해도 돼요). */
export default function SelectionToolbar({
  rect,
  marks,
  onToggle,
  onLink,
  // 선택한 글자가 한 블록 안일 때만 "타입 변경"을 보여줘요.
  turnInto,
  colors,
}) {
  const [open, setOpen] = useState(null); // null | "turn" | "color"
  const barRef = useRef(null);
  const [dx, setDx] = useState(0);

  // 화면 왼쪽/오른쪽 가장자리 근처에서 선택하면 툴바가 화면 밖으로 잘려서 일부 버튼을 못 눌러요 — 화면 안으로 밀어 넣어요.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || !rect) return;
    const w = el.offsetWidth;
    const center = rect.left + rect.width / 2;
    const clamped = Math.min(Math.max(center, w / 2 + 8), window.innerWidth - w / 2 - 8);
    setDx(clamped - center);
  }, [rect, turnInto?.currentLabel, !!colors]);

  if (!rect) return null;

  // 화면 맨 위쪽에서 선택하면 툴바가 위로 넘쳐서 안 보이니, 그럴 땐
  // 선택 영역 아래로 뒤집어요(PopoverPortal의 flip과 같은 생각).
  const flip = rect.top < 50;
  const top = flip ? rect.bottom + 8 : rect.top - 8;
  const left = rect.left + rect.width / 2;

  // 버튼을 누르는 순간(mousedown)에 포커스가 빠져나가면 지금 선택된
  // 텍스트 자체가 풀려버려서(브라우저 기본 동작) 서식을 적용할 대상이
  // 사라져요 — mousedown의 기본 동작만 막아서 선택을 그대로 유지한 채
  // 클릭(onClick)까지 이어지게 해요.
  const holdSelection = (e) => e.preventDefault();

  const items = [
    { key: "bold", label: "굵게 (Ctrl+B)", Icon: Bold, active: marks.bold },
    { key: "italic", label: "기울임 (Ctrl+I)", Icon: Italic, active: marks.italic },
    { key: "underline", label: "밑줄 (Ctrl+U)", Icon: Underline, active: marks.underline },
    { key: "strike", label: "취소선 (Ctrl+Shift+S)", Icon: Strikethrough, active: marks.strike },
    { key: "code", label: "인라인 코드 (Ctrl+E)", Icon: Code2, active: marks.code },
  ];

  const toggleOpen = (name) => setOpen((cur) => (cur === name ? null : name));

  return createPortal(
    <div
      ref={barRef}
      className="selection-toolbar"
      data-popover-portal="true"
      style={{
        position: "fixed",
        top,
        left: left + dx,
        transform: `translate(-50%, ${flip ? "0" : "-100%"})`,
      }}
    >
      {turnInto && (
        <>
          <button
            type="button"
            className={`selection-toolbar__text-btn${open === "turn" ? " is-active" : ""}`}
            title="타입 변경"
            onMouseDown={holdSelection}
            onClick={() => toggleOpen("turn")}
          >
            {turnInto.currentLabel}
            <ChevronDown size={12} />
          </button>
          <span className="selection-toolbar__divider" aria-hidden="true" />
        </>
      )}

      {items.map(({ key, label, Icon, active }) => (
        <button
          key={key}
          type="button"
          className={`selection-toolbar__btn${active ? " is-active" : ""}`}
          title={label}
          onMouseDown={holdSelection}
          onClick={() => onToggle(key)}
        >
          <Icon size={14} />
        </button>
      ))}

      <span className="selection-toolbar__divider" aria-hidden="true" />

      <button
        type="button"
        className={`selection-toolbar__btn${marks.link ? " is-active" : ""}`}
        title={marks.link ? "링크 제거 (Ctrl+K)" : "링크 (Ctrl+K)"}
        onMouseDown={holdSelection}
        onClick={onLink}
      >
        <Link2 size={14} />
      </button>

      {colors && (
        <button
          type="button"
          className={`selection-toolbar__text-btn selection-toolbar__color-btn${open === "color" ? " is-active" : ""}`}
          title="글자색 · 배경색"
          onMouseDown={holdSelection}
          onClick={() => toggleOpen("color")}
        >
          <span className="selection-toolbar__color-a">A</span>
          <ChevronDown size={12} />
        </button>
      )}

      {open === "turn" && turnInto && (
        <div className="selection-toolbar__menu" onMouseDown={holdSelection}>
          {turnInto.options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className={opt.type === turnInto.currentType ? "is-current" : ""}
              onClick={() => {
                setOpen(null);
                turnInto.onSelect(opt.type);
              }}
            >
              <opt.icon size={15} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {open === "color" && colors && (
        <div className="selection-toolbar__menu selection-toolbar__menu--colors" onMouseDown={holdSelection}>
          <p>글자색</p>
          <div className="selection-toolbar__swatches">
            {colors.text.map((c) => (
              <button
                key={`t-${c.key ?? "none"}`}
                type="button"
                title={c.label}
                className="selection-toolbar__swatch selection-toolbar__swatch--text"
                style={{ color: c.color || "#111a2f" }}
                onClick={() => {
                  setOpen(null);
                  colors.onApply("data-c", c.key);
                }}
              >
                A
              </button>
            ))}
          </div>
          <p>배경색</p>
          <div className="selection-toolbar__swatches">
            {colors.bg.map((c) => (
              <button
                key={`b-${c.key ?? "none"}`}
                type="button"
                title={c.label}
                className="selection-toolbar__swatch selection-toolbar__swatch--bg"
                style={{ background: c.key ? c.swatch : "#fff" }}
                onClick={() => {
                  setOpen(null);
                  colors.onApply("data-bg", c.key);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ================= LinkPopover =================
   링크 걸기 — 브라우저 기본 prompt 창 대신, 선택한 글자 바로 아래에 뜨는 작은 입력 팝오버예요.
   Enter로 적용, Esc나 바깥 클릭으로 취소해요. data-popover-portal 표시는 툴바와 같은 이유(에디터의
   바깥 클릭 처리가 이 안의 클릭을 "블록 선택 해제"로 오해하지 않게)로 달아요. */
export function LinkPopover({ rect, onSubmit, onCancel }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rect) return null;
  const flip = rect.bottom + 56 > window.innerHeight;
  const top = flip ? rect.top - 8 : rect.bottom + 8;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - 320));

  return createPortal(
    <div
      ref={ref}
      className="link-popover"
      data-popover-portal="true"
      style={{ position: "fixed", top, left, transform: flip ? "translateY(-100%)" : undefined }}
    >
      <input
        ref={inputRef}
        className="link-popover__input"
        value={value}
        placeholder="링크를 붙여넣거나 입력하세요"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onSubmit(value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      <button type="button" className="link-popover__btn" onClick={() => onSubmit(value)}>
        적용
      </button>
    </div>,
    document.body,
  );
}
