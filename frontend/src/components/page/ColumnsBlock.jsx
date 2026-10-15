import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

// 열 묶음(COLUMN_LIST)을 화면에 그리는 상자예요. 구조·규칙은 lib/blockColumns.js 참고.
//   columns: [{ id, weight, content }] — content는 BlockEditor가 그려 준 그 열 안의 블록 줄들
//   onResizeCommit({ [열 id]: 비율 }): 열 사이 경계를 끌어서 폭을 바꾸고 놓았을 때(한 번만 불러요)
//   onAddColumn / onRemoveColumn(열 id) / onRemoveAll: 마우스를 올리면 나오는 도구줄과 열의 ✕ 버튼
// 폭이 좁으면(폰·좁은 창) 열이 위아래로 쌓여요 — 컨테이너 쿼리 대신 ResizeObserver로 재요. 블록 줄 안에 position: fixed
// 팝업이 있어서 상자에 container-type을 주면(포함 블록이 바뀌어) 팝업이 틀어지기 때문이에요.
const STACK_BELOW = 560;
const MIN_COLUMN_PX = 70;
const KEY_STEP = 0.12; // ←/→ 키로 경계를 옮길 때 한 번에 옮기는 비율(두 열 비율 합 기준)

export default function ColumnsBlock({ listId, columns, style, canAdd, onResizeCommit, onAddColumn, onRemoveColumn, onRemoveAll }) {
  const rootRef = useRef(null);
  const columnRefs = useRef([]);
  const [narrow, setNarrow] = useState(false);
  const [live, setLive] = useState(null); // 끌고 있는 동안의 임시 비율 { [열 id]: 비율 }
  const [dragIndex, setDragIndex] = useState(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < STACK_BELOW);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const contentWidth = (el) => {
    const css = window.getComputedStyle(el);
    return el.getBoundingClientRect().width - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0);
  };

  // index번째 열의 왼쪽 경계(= index-1번째와 index번째 사이)를 끌어요.
  const startResize = (event, index) => {
    if (event.button !== undefined && event.button !== 0) return;
    const left = columns[index - 1];
    const right = columns[index];
    const leftEl = columnRefs.current[index - 1];
    const rightEl = columnRefs.current[index];
    if (!left || !right || !leftEl || !rightEl) return;

    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture?.(event.pointerId);

    const startX = event.clientX;
    const leftPx = contentWidth(leftEl);
    const rightPx = contentWidth(rightEl);
    const totalPx = leftPx + rightPx;
    const pairWeight = left.weight + right.weight;
    let latest = null;

    setDragIndex(index);

    const onMove = (e) => {
      const px = Math.min(Math.max(leftPx + (e.clientX - startX), MIN_COLUMN_PX), Math.max(MIN_COLUMN_PX, totalPx - MIN_COLUMN_PX));
      const nextLeft = (pairWeight * px) / totalPx;
      latest = { [left.id]: nextLeft, [right.id]: pairWeight - nextLeft };
      setLive(latest);
    };
    const finish = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      handle.releasePointerCapture?.(event.pointerId);
      setDragIndex(null);
      setLive(null);
      if (latest) onResizeCommit?.(latest);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  };

  const onResizeKeyDown = (event, index) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const left = columns[index - 1];
    const right = columns[index];
    const pairWeight = left.weight + right.weight;
    const step = pairWeight * KEY_STEP * (event.key === "ArrowLeft" ? -1 : 1);
    const nextLeft = Math.min(Math.max(left.weight + step, pairWeight * 0.15), pairWeight * 0.85);
    onResizeCommit?.({ [left.id]: nextLeft, [right.id]: pairWeight - nextLeft });
  };

  useEffect(() => {
    columnRefs.current.length = columns.length;
  }, [columns.length]);

  return (
    <div
      ref={rootRef}
      className={`block-columns${narrow ? " block-columns--stack" : ""}`}
      data-columns-id={listId}
      style={style}
    >
      <div className="block-columns__bar" contentEditable={false}>
        <button type="button" onClick={onAddColumn} disabled={!canAdd} title="열 추가" aria-label="열 추가">
          <Plus size={14} />
          <span>열 추가</span>
        </button>
        <button type="button" onClick={onRemoveAll} title="열 전체 삭제" aria-label="열 전체 삭제" className="danger">
          <Trash2 size={14} />
        </button>
      </div>

      {columns.map((column, index) => (
        <div
          key={column.id}
          ref={(el) => {
            columnRefs.current[index] = el;
          }}
          className={`block-column${index === 0 ? " block-column--first" : ""}`}
          data-column-id={column.id}
          style={narrow ? undefined : { flex: `${live?.[column.id] ?? column.weight} 1 0%` }}
        >
          {index > 0 && !narrow && (
            <div
              className={`block-column__resize${dragIndex === index ? " is-dragging" : ""}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="열 너비 조절"
              tabIndex={0}
              contentEditable={false}
              onPointerDown={(e) => startResize(e, index)}
              onKeyDown={(e) => onResizeKeyDown(e, index)}
            />
          )}

          <button
            type="button"
            className="block-column__remove"
            title="이 열 삭제"
            aria-label={`${index + 1}번째 열 삭제`}
            contentEditable={false}
            onClick={() => onRemoveColumn?.(column.id)}
          >
            <X size={12} />
          </button>

          {column.content}
        </div>
      ))}
    </div>
  );
}
