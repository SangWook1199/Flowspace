import { useEffect } from "react";
import { RICH_TEXT_TYPES } from "../lib/blockTypes.js";
import { computeHiddenBlockIds, expandSelectionWithSubtrees } from "../lib/blockTree.js";
import { BLOCKS_CLIPBOARD_TYPE, blocksToPlainText, blocksToClipboardJson } from "../lib/blockClipboard.js";
import { getOwnedPageIds, createEmptyBlock } from "../lib/blockFactory.js";

// 블록 선택과 관련된 window/document 이벤트 이펙트 모음이에요.
// - 빈 공간에서 사각형으로 드래그해 여러 블록 고르기
// - 에디터 바깥을 클릭하면 선택 풀기
// - 선택된 블록이 있을 때 키보드(Esc, ↑↓, Shift+↑↓, Enter, Backspace, Ctrl+A/D/Z/Y, Ctrl+Shift+↑↓, Ctrl+/)
// - 키보드로 ↑↓ 이동 중엔 핸들을 숨기는 클래스
// - 선택된 블록 복사·잘라내기·붙여넣기
// 이펙트들은 "가장 최근 렌더의 함수/상태"를 써야 해서 (의존성 배열이 없거나 blocks·선택을 넣은 채로)
// BlockEditor 안에 있던 때와 똑같이 등록해요.
export default function useBlockSelectionShortcuts({ blocks, editorRef, inputRefs, selection, actions, isMenuOpen }) {
  const {
    selectedBlockIds,
    setSelectedBlockIds,
    isBoxSelecting,
    setIsBoxSelecting,
    setSelectionBox,
    selectionStartRef,
    selectionBlockRectsRef,
    selectionAnchorIdRef,
    selectionCursorRef,
  } = selection;
  const {
    setBulkMenu,
    focusBlock,
    handleUndo,
    handleRedo,
    bulkDeleteSelected,
    bulkDuplicateSelected,
    bulkMoveSelected,
    pushUndoSnapshot,
    setBlocks,
    nextId,
    onCreateChildPage,
    readClipboardBlocks,
    insertPastedBlocks,
  } = actions;

  // 실제 사각형 계산은 window 레벨 mousemove/mouseup으로 처리해요 —
  // 마우스가 .block-editor 바깥으로 나가도(예: 페이지 스크롤 영역
  // 바깥) 드래그가 안 끊기게 하려고요. isBoxSelecting이 true인 동안만
  // 리스너를 달아요.
  useEffect(() => {
    if (!isBoxSelecting) return;

    // 드래그하는 동안 옆 블록의 안내 문구·제목 같은 텍스트가 브라우저
    // 기본 선택으로 같이 파랗게 잡히는 걸 막아요 — 우리 쪽 사각형/블록
    // 하이라이트만 보이면 돼요.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMove = (e) => {
      const start = selectionStartRef.current;
      if (!start || !editorRef.current) return;
      const x1 = Math.min(start.x, e.clientX);
      const y1 = Math.min(start.y, e.clientY);
      const x2 = Math.max(start.x, e.clientX);
      const y2 = Math.max(start.y, e.clientY);

      const containerRect = editorRef.current.getBoundingClientRect();
      setSelectionBox({
        left: x1 - containerRect.left,
        top: y1 - containerRect.top,
        width: x2 - x1,
        height: y2 - y1,
      });

      const next = new Set();
      selectionBlockRectsRef.current.forEach(({ id, rect }) => {
        const intersects = rect.left < x2 && rect.right > x1 && rect.top < y2 && rect.bottom > y1;
        if (intersects) next.add(id);
      });
      setSelectedBlockIds(next);
      // 드래그가 끝난 뒤 shift+클릭으로 범위를 이어갈 수 있게, 지금까지
      // 선택된 블록 중 문서상 가장 아래쪽 블록을 기준점(anchor)으로
      // 갱신해요(selectionBlockRectsRef가 이미 문서 순서라 배열의 마지막
      // 항목이 가장 아래예요).
      const idsInOrder = Array.from(next);
      if (idsInOrder.length > 0) selectionAnchorIdRef.current = idsInOrder[idsInOrder.length - 1];
    };

    const handleUp = () => {
      setIsBoxSelecting(false);
      setSelectionBox(null);
      selectionStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isBoxSelecting]);

  // 선택된 블록이 있는 동안, 에디터 바깥(페이지 제목·커버 이미지 등)을
  // 클릭하면 선택을 풀어요 — 에디터 안쪽 클릭·드래그는 이미 위
  // handleSelectionMouseDown이 처리하니, 여기선 "바깥" 클릭일 때만
  // 반응해요.
  useEffect(() => {
    if (selectedBlockIds.size === 0) return;
    const handleOutsideMouseDown = (e) => {
      if (editorRef.current && editorRef.current.contains(e.target)) return;
      // 핸들 메뉴(배경색·복제하기·삭제 등)는 overflow 문제 때문에
      // PopoverPortal이 document.body로 포털링해서 그려요(PopoverPortal.jsx
      // 참고) — 그래서 DOM 트리상으론 editorRef 바깥이지만, 사용자
      // 입장에선 "에디터 바깥"이 아니에요. 이걸 안 거르면 메뉴 안의 버튼을
      // 누르는 mousedown 자체가 "바깥 클릭"으로 잡혀서 onClick이 실행되기도
      // 전에 selectedBlockIds가 비어버려요(요청: "여러 블록 선택 후
      // 복제가 안돼" — 이게 원인이었어요. 복제뿐 아니라 배경색·글자색·
      // 삭제도 같은 이유로 똑같이 영향을 받았어요).
      if (e.target.closest?.("[data-popover-portal]")) return;
      setSelectedBlockIds(new Set());
      selectionAnchorIdRef.current = null;
    };
    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
  }, [selectedBlockIds]);

  // 요청: "노션의 여러 블록 조작을 검색해보고 지금과 다른점을 나열하고
  // 해결해" — 노션 공식 키보드 단축키 문서(notion.com/help/keyboard
  // -shortcuts)에 있는, 블록 선택과 관련된 단축키들을 그대로 옮겨왔어요.
  // - Esc: 커서가 있는 블록을 선택(문서: "select the block you're
  //   currently in"), 이미 선택된 게 있으면 선택 해제("or to clear
  //   selected blocks").
  // - cmd/ctrl+a (블록 텍스트 편집 중이 아닐 때): 페이지의 모든 블록을
  //   선택. 텍스트를 편집하는 중일 때는 절대 안 끼어들게 해서, 입력창
  //   안에서 원래 하던 "그 블록 텍스트 전체 선택"은 그대로 브라우저
  //   기본 동작에 맡겨요.
  // - Backspace/Delete: 선택된 블록 삭제.
  // - cmd/ctrl+D: 선택된 블록 복제.
  // - cmd/ctrl+shift+위/아래 화살표: 선택된 블록(들)을 위/아래로 이동.
  // - cmd/ctrl+/: 선택된 블록들의 일괄 메뉴 열기(문서: "edit or change
  //   one or more selected blocks").
  // 이 단축키들(Esc 제외)은 전부 "지금 블록 텍스트를 편집 중이 아닐
  // 때"만 동작해야 해요 — 안 그러면 텍스트 안에서 Backspace로 글자
  // 지우다가 블록이 통째로 사라지는 등 일반 타이핑을 방해해요.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      const isTypingInBlock = Object.values(inputRefs.current).includes(active);

      if (e.key === "Escape") {
        // 한글 등 조합 중의 Esc는 조합을 취소하는 키예요 — 블록 선택으로 넘기면 조합 중이던 글자가 꼬여요.
        if (e.isComposing || e.keyCode === 229) return;
        // 핸들 메뉴 같은 팝오버를 닫는 데 쓰인 Esc면(PopoverPortal이 표시) 선택은 그대로 둬요.
        if (e.defaultPrevented) return;
        if (isTypingInBlock) {
          e.preventDefault();
          const entry = Object.entries(inputRefs.current).find(([, el]) => el === active);
          active.blur();
          if (entry) {
            const id = Number(entry[0]);
            setSelectedBlockIds(new Set([id]));
            selectionAnchorIdRef.current = id;
          }
          return;
        }
        if (selectedBlockIds.size > 0) {
          setSelectedBlockIds(new Set());
          selectionAnchorIdRef.current = null;
        }
        return;
      }

      if (isTypingInBlock) return;
      // 메뉴가 열려 있는 동안엔(메뉴 안 검색창 입력 등) 블록 단축키가 끼어들지 않게 해요 — Esc로 닫은 뒤부터 동작해요.
      if (isMenuOpen) return;
      // 메뉴·팝오버 안의 입력창에서 친 키(Backspace 등)로 블록이 지워지면 안 돼요.
      if (active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable)) return;

      // 요청: "복제를 한 후 ctrl z 를 누르면 복제된 블록 전체가 삭제되야
      // 하는데" — 텍스트를 편집 중일 때는 여기서 아무것도 안 하고 그대로
      // 흘려보내서 <textarea>가 원래 갖고 있는 브라우저 기본 되돌리기
      // (글자 단위)가 동작하게 두고, 편집 중이 아닐 때만(복제·삭제·이동
      // 같은 블록 구조 변경 직후) 우리 undo 스택을 되돌려요. 선택된
      // 블록이 있고 없고와 무관하게 항상 동작해야 해서 아래
      // selectedBlockIds.size 가드보다 먼저 처리해요.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedBlockIds(new Set(blocks.map((b) => b.id)));
        return;
      }

      if (selectedBlockIds.size === 0) return;

      // 버튼·입력창 등에 포커스가 있을 땐(메뉴 조작 등) 방향키/Enter를 가로채지 않아요.
      const activeTag = active?.tagName;
      // 블록 왼쪽 핸들(⋮⋮, +)에 포커스가 남아 있는 건(핸들 메뉴를 Esc로 닫은 직후 등) "블록을 조작 중"인 거라 예외예요.
      const onBlockHandle = !!active?.closest?.(".block-drag-handle, .block-add-btn");
      const focusOnControl =
        active && active !== document.body && !onBlockHandle && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(activeTag);

      // 노션처럼 블록이 선택된 상태에서: ↑/↓는 선택을 한 블록씩 옮기고, Shift+↑/↓는 늘리고 줄이며,
      // Enter는 선택한 블록의 글자 편집을 시작해요.
      if (!focusOnControl && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const hidden = computeHiddenBlockIds(blocks);
        const visible = blocks.filter((b) => !hidden.has(b.id)).map((b) => b.id);
        const picked = visible.filter((id) => selectedBlockIds.has(id));
        if (picked.length === 0) return;
        const down = e.key === "ArrowDown";
        const cursor = selectionCursorRef.current;
        const cursorValid =
          cursor.anchor != null &&
          cursor.anchor === selectionAnchorIdRef.current &&
          selectedBlockIds.has(cursor.anchor) &&
          selectedBlockIds.has(cursor.focus);
        let anchorId;
        let focusId;
        if (cursorValid) {
          anchorId = cursor.anchor;
          focusId = cursor.focus;
        } else {
          anchorId = down ? picked[0] : picked[picked.length - 1];
          focusId = down ? picked[picked.length - 1] : picked[0];
        }
        const at = visible.indexOf(focusId);
        const nextFocus = visible[Math.max(0, Math.min(visible.length - 1, at + (down ? 1 : -1)))];
        if (e.shiftKey) {
          const a = visible.indexOf(anchorId);
          const f = visible.indexOf(nextFocus);
          const [from, to] = a < f ? [a, f] : [f, a];
          setSelectedBlockIds(new Set(visible.slice(from, to + 1)));
          selectionAnchorIdRef.current = anchorId;
          selectionCursorRef.current = { anchor: anchorId, focus: nextFocus };
        } else {
          setSelectedBlockIds(new Set([nextFocus]));
          selectionAnchorIdRef.current = nextFocus;
          selectionCursorRef.current = { anchor: nextFocus, focus: nextFocus };
        }
        editorRef.current
          ?.querySelector(`.block-row[data-block-id="${nextFocus}"]`)
          ?.scrollIntoView({ block: "nearest" });
        return;
      }

      if (!focusOnControl && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const firstId = blocks.map((b) => b.id).find((id) => selectedBlockIds.has(id));
        const target = blocks.find((b) => b.id === firstId);
        if (target && (RICH_TEXT_TYPES.includes(target.type) || target.type === "CODE")) {
          e.preventDefault();
          setSelectedBlockIds(new Set());
          selectionAnchorIdRef.current = null;
          focusBlock(target.id, "end");
        }
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        bulkDeleteSelected();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        bulkDuplicateSelected();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        bulkMoveSelected(e.key === "ArrowUp" ? "up" : "down");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        const firstSelected = blocks.map((b) => b.id).find((id) => selectedBlockIds.has(id));
        if (firstSelected != null) setBulkMenu({ anchorBlockId: firstSelected, mode: "main" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBlockIds, blocks, isMenuOpen]);

  // 키보드(↑/↓)로 블록 사이를 옮기는 동안엔 마우스 포인터가 우연히 올라가 있는 행의 핸들(+ / 드래그)이
  // 튀어나오지 않게 숨겨요. 마우스가 실제로 움직이면(좌표가 바뀌면) 다시 평소처럼 호버로 보여요.
  useEffect(() => {
    let lastX = null;
    let lastY = null;
    const onKey = (e) => {
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        editorRef.current?.classList.add("is-keyboard-nav");
      }
    };
    const onMove = (e) => {
      // 스크롤 뒤에 브라우저가 같은 좌표로 보내는 가짜 mousemove는 무시해요.
      if (e.clientX === lastX && e.clientY === lastY) return;
      lastX = e.clientX;
      lastY = e.clientY;
      editorRef.current?.classList.remove("is-keyboard-nav");
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousemove", onMove, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousemove", onMove, true);
    };
  }, []);

  // 노션처럼 블록을 선택한 채(글자 편집 중이 아닐 때) Ctrl+C / Ctrl+X / Ctrl+V.
  // 선택된 블록은 실제 텍스트 선택이 아니라서 브라우저 기본 복사가 아무것도 못 해요.
  useEffect(() => {
    const isEditing = () => {
      const active = document.activeElement;
      if (!active || active === document.body) return false;
      return Object.values(inputRefs.current).includes(active) || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    };

    const handleCopyCut = (e) => {
      if (selectedBlockIds.size === 0 || isEditing()) return;
      const nativeSel = window.getSelection();
      if (nativeSel && !nativeSel.isCollapsed && nativeSel.toString().length > 0) return;
      const ids = expandSelectionWithSubtrees(blocks, selectedBlockIds);
      const picked = blocks.filter((b) => ids.has(b.id));
      if (picked.length === 0 || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData("text/plain", blocksToPlainText(picked));
      e.clipboardData.setData(BLOCKS_CLIPBOARD_TYPE, blocksToClipboardJson(picked));
      if (e.type === "cut") {
        // 하위 페이지를 품은 블록은 잘라내기로 지우면 페이지가 딸려 사라질 수 있어서, 복사만 해요.
        if (picked.some((b) => getOwnedPageIds(b).length > 0)) return;
        pushUndoSnapshot();
        setBlocks((prev) => {
          const next = prev.filter((b) => !ids.has(b.id));
          return next.length > 0 ? next : [createEmptyBlock(nextId(), "TEXT", onCreateChildPage)];
        });
        setSelectedBlockIds(new Set());
        selectionAnchorIdRef.current = null;
      }
    };

    const handlePasteSelected = (e) => {
      if (selectedBlockIds.size === 0 || isEditing()) return;
      const items = readClipboardBlocks(e.clipboardData);
      if (!items) return;
      e.preventDefault();
      const lastSelected = [...blocks].reverse().find((b) => selectedBlockIds.has(b.id));
      if (!lastSelected) return;
      setSelectedBlockIds(new Set());
      selectionAnchorIdRef.current = null;
      insertPastedBlocks(items, lastSelected.id);
    };

    window.addEventListener("copy", handleCopyCut);
    window.addEventListener("cut", handleCopyCut);
    window.addEventListener("paste", handlePasteSelected);
    return () => {
      window.removeEventListener("copy", handleCopyCut);
      window.removeEventListener("cut", handleCopyCut);
      window.removeEventListener("paste", handlePasteSelected);
    };
  });
}
