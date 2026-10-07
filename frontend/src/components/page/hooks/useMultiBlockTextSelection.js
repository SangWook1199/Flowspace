import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { escapePlainTextToHtml, sanitizeInlineHtml } from "../RichTextInput.jsx";
import { computeHiddenBlockIds, findParentIndex } from "../lib/blockTree.js";
import { restoreCaretOffset, sliceBlocksAroundRange } from "../lib/caret.js";
import { computeHorizontalTarget, computeVerticalTarget, recordGoalX, richElOf } from "../lib/selectionMove.js";

// 여러 블록에 걸친 "텍스트" 선택(드래그나 Shift+방향키로 만든 선택)을 다루는 훅이에요.
//
// 블록마다 contentEditable이 따로라서, 브라우저는 선택이 한 블록 밖으로 나가는 걸 허용하지 않아요.
// 그래서 여러 블록에 걸친 선택이 필요한 동안에만 에디터 전체(.block-editor)를 잠깐 "하나의 편집
// 호스트"로 바꿔요(setEditorSingleHost). 이 상태에서는 브라우저가 블록 DOM을 직접 합치거나 쪼개면
// 리액트가 관리하는 블록 구조와 어긋나서 내용이 깨지니, 입력은 전부 막고 우리가 블록 배열을 직접
// 고쳐요(deleteAcrossBlocks). 선택이 한 블록 안으로 줄어들거나 풀리면 바로 원래대로 돌려요.
//
// 이 훅이 하는 일
//  - 호스트 켜기/끄기, 선택이 걸친 블록 수 세기
//  - 호스트인 동안 beforeinput/dragstart/drop 막기(삭제 입력은 블록 병합 삭제로 대신 처리)
//  - Backspace/Delete: 선택 범위 삭제 → 첫 블록 앞부분과 마지막 블록 뒷부분이 한 블록으로 합쳐져요
//  - 글자 입력: 선택 범위를 그 글자로 바꿔요. 한글 같은 조합 입력은 브라우저가 막을 수 없어서
//    조합이 시작되는 순간 선택 범위를 먼저 지우고 커서를 합쳐진 블록으로 옮겨서 그 자리에서 조합을 이어가요.
//  - Shift+↑/↓/←/→: 워드프로세서·노션처럼 같은 가로 위치에서 한 줄(↑↓)/한 글자(←→)씩 선택을 넓혀요. 블록의
//    첫/마지막 줄이나 맨 앞/맨 끝에 닿으면 이웃 블록으로 이어져요(계산은 lib/selectionMove.js)
export default function useMultiBlockTextSelection({
  editorRef,
  inputRefs,
  blocks,
  setBlocks,
  pushUndoSnapshot,
  deleteOwnedPages,
  setSelectionToolbar,
  onEscapeToBlockSelection,
}) {
  // 지금 에디터 전체가 하나의 편집 호스트인지.
  const multiBlockHostRef = useRef(false);

  // 에디터 전체를 하나의 편집 호스트로 켜고/끄기. 리액트가 이 속성을 관리하지 않도록 DOM 속성을
  // 직접 바꿔요 — 그래서 리렌더가 일어나도 덮어써지지 않아요.
  const setEditorSingleHost = (on) => {
    const el = editorRef.current;
    multiBlockHostRef.current = on;
    if (!el) return;
    if (on) {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");
    } else {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    }
  };

  // 지금 선택 범위가 걸쳐 있는 리치 텍스트 블록 개수.
  const countRichBlocksInSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return 0;
    const range = sel.getRangeAt(0);
    const els = editorRef.current?.querySelectorAll("[data-rich-block-id]") || [];
    return Array.from(els).filter((el) => range.intersectsNode(el)).length;
  };

  // 하나의 편집 호스트 상태를 풀고 원래대로(블록마다 따로 편집) 되돌려요. 호스트였던 동안엔 포커스가
  // 에디터 전체에 가 있어서, 그냥 속성만 떼면 커서가 블록 안에 보여도 타이핑이 안 돼요 — 그래서 지금
  // 선택(커서)이 들어 있는 블록에 포커스를 다시 주고 선택 범위도 그대로 복원해요.
  const releaseEditorSingleHost = useCallback(() => {
    if (!multiBlockHostRef.current) return;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    // 선택 방향(어느 쪽이 고정점이고 어느 쪽이 움직이는 끝인지)도 그대로 되살려야 Shift+방향키가 이어서 맞게 동작해요.
    const ends = sel && sel.anchorNode ? [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset] : null;
    multiBlockHostRef.current = false;
    const editorEl = editorRef.current;
    if (editorEl) {
      editorEl.removeAttribute("contenteditable");
      editorEl.removeAttribute("spellcheck");
    }
    if (!range || !editorEl) return;
    const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const richEl = node?.closest?.("[data-rich-block-id]");
    if (richEl && editorEl.contains(richEl)) {
      richEl.focus({ preventScroll: true });
      try {
        sel.setBaseAndExtent(...ends);
      } catch {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 여러 블록에 걸친 선택 범위를 지우고, 남은 앞/뒤 조각을 첫 블록 하나로 합쳐요(노션과 같아요).
  // 첫 블록의 종류·서식은 그대로 두고, 사이 블록과 마지막 블록은 없애요(접힌 토글 안의 숨은
  // 자식은 그 토글이 같이 지워질 때만 지워요). 커서는 합쳐진 자리에 놓여요. replacement를 주면 지운 자리에
  // 그 글자를 넣어요(선택한 상태에서 글자를 치면 선택이 그 글자로 바뀌는 동작). 처리했으면 true.
  // 여러 블록에 걸친 글자 선택에서 Esc를 누르면: 글자 선택은 풀고, 선택 범위가 닿은 블록들(사이에 낀 이미지·표
  // 같은 블록도, 접혀서 숨은 블록은 빼고)을 블록 다중 선택으로 바꿔요. 처리했으면 true.
  const escapeToBlockSelection = () => {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !editor) return false;
    const range = sel.getRangeAt(0);
    const richEls = Array.from(editor.querySelectorAll("[data-rich-block-id]")).filter((el) => range.intersectsNode(el));
    if (richEls.length < 2) return false;
    const idxOf = (id) => blocks.findIndex((b) => b.id === id);
    const first = idxOf(Number(richEls[0].dataset.richBlockId));
    const last = idxOf(Number(richEls[richEls.length - 1].dataset.richBlockId));
    if (first === -1 || last < first) return false;
    const hidden = computeHiddenBlockIds(blocks);
    const ids = blocks.slice(first, last + 1).filter((b) => !hidden.has(b.id)).map((b) => b.id);
    // 선택을 시작한 쪽(anchor)과 움직이던 쪽(focus) 블록 — 이어서 Shift+↑/↓로 블록 선택을 넓힐 때 기준이 돼요.
    const idOfNode = (n) => {
      const r = (n?.nodeType === Node.ELEMENT_NODE ? n : n?.parentElement)?.closest?.("[data-rich-block-id]");
      return r ? Number(r.dataset.richBlockId) : null;
    };
    const anchorId = idOfNode(sel.anchorNode) ?? ids[0];
    const focusId = idOfNode(sel.focusNode) ?? ids[ids.length - 1];
    setEditorSingleHost(false);
    sel.removeAllRanges();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
    setSelectionToolbar(null);
    onEscapeToBlockSelection?.(ids, anchorId, focusId);
    return true;
  };

  const deleteAcrossBlocks = (replacement = "", { sync = false } = {}) => {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !editor) return false;
    const range = sel.getRangeAt(0).cloneRange();
    const richEls = Array.from(editor.querySelectorAll("[data-rich-block-id]")).filter((el) => range.intersectsNode(el));
    if (richEls.length < 2) return false;

    const startEl = richEls[0];
    const endEl = richEls[richEls.length - 1];
    const startId = Number(startEl.dataset.richBlockId);
    const endId = Number(endEl.dataset.richBlockId);
    const list = blocks;
    const startIdx = list.findIndex((b) => b.id === startId);
    const endIdx = list.findIndex((b) => b.id === endId);
    if (startIdx === -1 || endIdx <= startIdx) return false;

    const hidden = computeHiddenBlockIds(list);
    const removeIds = new Set();
    for (let i = startIdx + 1; i <= endIdx; i += 1) {
      // 접혀서 숨은 블록은 "눈에 보이는 가장 가까운 조상"이 지워질 때만 같이 지워요.
      let a = i;
      while (a >= 0 && hidden.has(list[a].id)) a = findParentIndex(list, a);
      if (a > startIdx) removeIds.add(list[i].id);
    }

    const { head, tail, headLength } = sliceBlocksAroundRange(startEl, endEl, range);
    const removed = list.filter((b) => removeIds.has(b.id));
    // 하위 페이지를 가진 블록이 섞여 있으면 확인창이 떠서 이어지는 편집이 잠깐 미뤄져요(그동안 입력은 막아 둬요).
    deleteOwnedPages(removed, "선택한 범위에 포함된 블록을 지우면 연결된 하위 페이지도 함께 휴지통으로 이동해요. 계속할까요?", () => {
      const insertHtml = replacement ? escapePlainTextToHtml(replacement).replace(/ /g, "&nbsp;") : "";
      const merged = sanitizeInlineHtml(head + insertHtml + tail);
      pushUndoSnapshot();
      sel.removeAllRanges();
      setEditorSingleHost(false);
      const apply = () => {
        // 서식 툴바는 지워질 블록의 DOM을 들고 있으니 같이 숨겨요(사라진 DOM으로 선택 범위를 계산하면 에러가 나요).
        setSelectionToolbar(null);
        setBlocks((prev) =>
          prev
            .filter((b) => !removeIds.has(b.id))
            .map((b) => (b.id === startId ? { ...b, content: merged, richText: true } : b)),
        );
      };
      const placeCaret = () => {
        const el = inputRefs.current[startId];
        if (el) restoreCaretOffset(el, headLength + replacement.length);
      };
      if (sync) {
        // 한글 같은 조합 입력은 시작 이벤트가 끝나면 곧바로 브라우저가 "지금 커서 자리"에 글자를 넣어요.
        // 그래서 그 전에 화면(DOM)까지 바로 고치고 커서를 합쳐진 블록에 옮겨둬요.
        flushSync(apply);
        placeCaret();
      } else {
        apply();
        requestAnimationFrame(placeCaret);
      }
    });
    return true;
  };

  // 이벤트 리스너는 한 번만 달고, 항상 "가장 최근 렌더의 함수"를 부르게 해요(오래된 blocks를 붙잡지 않게).
  const latestRef = useRef(null);
  latestRef.current = { escapeToBlockSelection, deleteAcrossBlocks, releaseEditorSingleHost, countRichBlocksInSelection, setEditorSingleHost };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const L = () => latestRef.current;

    // 호스트인 동안: 타이핑·붙여넣기·엔터·끌어서 옮기기는 막고(블록 구조가 깨져요), 삭제(잘라내기 포함)는
    // 블록 병합 삭제로 대신 처리해요. 복사(Ctrl+C)는 입력이 아니라서 그대로 돼요.
    const onBeforeInput = (e) => {
      if (!multiBlockHostRef.current) return;
      e.preventDefault();
      if (typeof e.inputType === "string" && e.inputType.startsWith("delete")) L().deleteAcrossBlocks();
      // 선택한 채로 글자를 치면 선택 범위가 그 글자로 바뀌어요(조합 입력은 compositionstart에서 따로 처리).
      else if (e.inputType === "insertText" && typeof e.data === "string" && e.data) L().deleteAcrossBlocks(e.data);
    };
    const blockWhileSingleHost = (e) => {
      if (multiBlockHostRef.current) e.preventDefault();
    };

    const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    // 연속으로 ↑/↓를 누를 때 같은 가로 위치(열)를 유지하려고 기억해두는 값(lib/selectionMove.js 참고).
    const goalXRef = { current: null };
    // 우리가 키보드로 마지막에 옮겨 둔 선택 끝 위치. 이 자리 그대로면 "의도해서 놓은 자리"라 아래 보정을 안 해요.
    const placedRef = { current: null };
    const markPlaced = (sel) => {
      placedRef.current = sel.focusNode ? { node: sel.focusNode, offset: sel.focusOffset } : null;
    };
    const isPlaced = (sel) => placedRef.current?.node === sel.focusNode && placedRef.current?.offset === sel.focusOffset;

    // 선택 끝(focus)을 방향키 한 번만큼 옮겨요(워드프로세서·노션과 같은 규칙).
    //  - ↑/↓: 같은 가로 위치에서 정확히 한 줄. 블록의 첫/마지막 줄이면 이웃 블록의 가장 가까운 줄로 넘어가요.
    //  - ←/→: 한 글자. 블록 맨 앞/맨 끝이면 이웃 블록으로(줄바꿈 한 칸).
    // 옮길 곳이 없으면(첫/마지막 블록) ↑/↓는 그 블록의 맨 앞/맨 끝까지 선택해요.
    // 움직였으면 true.
    // 마우스로 위쪽으로 드래그한 선택(focus가 anchor보다 앞)이 이전 블록의 맨 끝에서 끝나 있으면, 눈에 보이는 위치는
    // "다음 블록의 맨 앞"이에요(선택 영역이 그 블록 글자부터 시작하니까). 그 상태에서 ↑를 누르면 한 줄이 아니라 두 줄이
    // 올라가 버려서, 계산하기 전에 선택 끝을 다음 블록 맨 앞으로 옮겨 맞춰요. 키보드로 우리가 직접 놓은 자리(짧은 줄
    // 끝 등)는 그 자리가 맞으니 건드리지 않아요.
    const normalizeBackwardFocus = (sel) => {
      if (!sel.anchorNode || !sel.focusNode) return;
      const probe = document.createRange();
      probe.setStart(sel.anchorNode, sel.anchorOffset);
      probe.setEnd(sel.focusNode, sel.focusOffset);
      if (!probe.collapsed) return; // 앞으로 만든 선택(또는 빈 선택)
      const rich = richElOf(sel.focusNode);
      if (!rich || rich.contains(sel.anchorNode)) return;
      const tail = document.createRange();
      tail.selectNodeContents(rich);
      tail.setStart(sel.focusNode, sel.focusOffset);
      if (tail.toString().replace(/\u200b/g, "") !== "") return; // 블록 끝이 아니에요
      const all = Array.from(el.querySelectorAll("[data-rich-block-id]"));
      const next = all[all.indexOf(rich) + 1];
      if (next) sel.extend(next, 0);
    };

    const extendOnce = (sel, key) => {
      if (!isPlaced(sel)) normalizeBackwardFocus(sel);
      const vertical = key === "ArrowUp" || key === "ArrowDown";
      let pos = null;
      if (vertical) {
        pos = computeVerticalTarget(sel, el, key === "ArrowUp", goalXRef);
      } else {
        goalXRef.current = null;
        const h = computeHorizontalTarget(sel, el, key === "ArrowLeft");
        if (h && !h.crossed) {
          sel.modify("extend", key === "ArrowLeft" ? "backward" : "forward", "character");
          markPlaced(sel);
          return true;
        }
        pos = h;
      }
      if (!pos) return false;
      sel.extend(pos.node, pos.offset);
      if (vertical) recordGoalX(sel, goalXRef);
      markPlaced(sel);
      // 이동한 선택 끝이 화면 밖이면 보이게 스크롤해요.
      richElOf(sel.focusNode)?.scrollIntoView({ block: "nearest" });
      return true;
    };

    const onKeyDown = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      // Shift 없이 방향키를 누르거나 다른 키를 누르면 기억해 둔 열을 잊어요.
      if (!(e.shiftKey && ARROWS.includes(e.key)) && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) goalXRef.current = null;

      if (multiBlockHostRef.current) {
        // 여러 블록에 걸친 선택이 있는 동안 — 블록 하나짜리 키 처리(Enter로 쪼개기 등)가 여러 블록 DOM에
        // 손대지 못하게 여기서 먼저 가로채요.
        if ((e.key === "Backspace" || e.key === "Delete") && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          L().deleteAcrossBlocks();
          return;
        }
        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.key === "Escape") {
          if (L().escapeToBlockSelection()) {
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && ARROWS.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          extendOnce(sel, e.key);
          if (L().countRichBlocksInSelection() < 2) L().releaseEditorSingleHost();
        }
        return;
      }

      // 평소(블록 하나 안에서 편집 중): Shift+←/→는 브라우저 기본 동작에 맡기다가 블록 맨 앞/맨 끝에 닿으면,
      // Shift+↑/↓는 항상 직접 계산해서 한 줄씩 — 블록의 첫/마지막 줄이면 이웃 블록으로 넘어가서 이어요.
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || !ARROWS.includes(e.key)) return;
      const richEl = e.target?.closest?.("[data-rich-block-id]");
      if (!richEl || !el.contains(richEl) || richElOf(sel.focusNode) !== richEl) return;

      const { anchorNode, anchorOffset, focusNode, focusOffset } = sel;
      let pos;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        // ↑/↓는 블록 안에서도 직접 옮겨요 — 브라우저 기본 이동과 섞이면 "처음 커서가 있던 열"을 잃어버려서,
        // 위로 갔다가 다시 내려오면 커서가 왼쪽 끝에 가 있었어요.
        pos = computeVerticalTarget(sel, el, e.key === "ArrowUp", goalXRef);
        if (!pos) return;
        if (pos.toEdge || pos.node === richEl || richElOf(pos.node) === richEl) {
          e.preventDefault();
          e.stopPropagation();
          sel.extend(pos.node, pos.offset);
          recordGoalX(sel, goalXRef);
          markPlaced(sel);
          return;
        }
      } else {
        const h = computeHorizontalTarget(sel, el, e.key === "ArrowLeft");
        if (!h || !h.crossed) return;
        pos = h;
      }

      e.preventDefault();
      e.stopPropagation();
      L().setEditorSingleHost(true);
      // 호스트로 바꾸는 사이 선택이 흐트러질 수 있어서 원래 anchor/focus를 다시 맞춘 뒤 이어서 넓혀요.
      try {
        sel.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
        sel.extend(pos.node, pos.offset);
      } catch {
        // 무시 — 아래에서 한 블록으로 줄어든 걸로 보고 되돌려요.
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") recordGoalX(sel, goalXRef);
      markPlaced(sel);
      richElOf(sel.focusNode)?.scrollIntoView({ block: "nearest" });
      if (L().countRichBlocksInSelection() < 2) L().releaseEditorSingleHost();
    };

    // 한글 등 조합 입력은 beforeinput을 취소할 수 없어서(브라우저가 선택을 지우고 블록 DOM을 직접 합쳐버려요)
    // 조합이 시작되는 순간에 먼저 선택 범위를 우리 방식으로 지우고 커서를 합쳐진 블록으로 옮겨 둬요.
    const onCompositionStart = () => {
      if (!multiBlockHostRef.current) return;
      L().deleteAcrossBlocks("", { sync: true });
    };

    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("compositionstart", onCompositionStart);
    el.addEventListener("dragstart", blockWhileSingleHost);
    el.addEventListener("drop", blockWhileSingleHost);
    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("compositionstart", onCompositionStart);
      el.removeEventListener("dragstart", blockWhileSingleHost);
      el.removeEventListener("drop", blockWhileSingleHost);
      el.removeEventListener("keydown", onKeyDown);
    };
  }, [editorRef]);

  return { multiBlockHostRef, setEditorSingleHost, releaseEditorSingleHost, countRichBlocksInSelection };
}
