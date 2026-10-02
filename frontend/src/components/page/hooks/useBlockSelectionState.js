import { useRef, useState } from "react";

// 블록 선택(여러 블록을 파랗게 잡는 것)과 관련된 상태·ref 묶음이에요.
// 선택을 "바꾸는" 키보드·복붙 로직은 useBlockSelectionShortcuts.js에 있어요.
export default function useBlockSelectionState() {
  // 현재 선택된 블록 id들.
  const [selectedBlockIds, setSelectedBlockIds] = useState(() => new Set());
  // 빈 공간에서 드래그해 사각형으로 여러 블록을 고르는 중인지, 그 사각형(.block-editor 기준 좌표).
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null); // {left, top, width, height}
  const selectionStartRef = useRef(null); // {x, y} — 뷰포트 좌표(clientX/Y), 드래그 시작점
  const selectionBlockRectsRef = useRef([]); // [{id, rect}] — 드래그 시작 시점에 한 번만 스냅샷
  // shift+클릭·Shift+↑↓로 범위를 이을 때 쓰는 "기준점(anchor)". Esc로 블록을 고르거나 클릭할 때마다 갱신돼요.
  const selectionAnchorIdRef = useRef(null);
  // Shift+↑/↓로 선택을 늘릴 때 "움직이는 쪽 끝"(focus)을 기억해요. anchor와 짝으로만 유효해요.
  const selectionCursorRef = useRef({ anchor: null, focus: null });

  return {
    selectedBlockIds,
    setSelectedBlockIds,
    isBoxSelecting,
    setIsBoxSelecting,
    selectionBox,
    setSelectionBox,
    selectionStartRef,
    selectionBlockRectsRef,
    selectionAnchorIdRef,
    selectionCursorRef,
  };
}
