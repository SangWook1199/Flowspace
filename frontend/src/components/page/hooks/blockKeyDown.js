import { LIST_TYPES, MULTILINE_TYPES, RICH_TEXT_TYPES, filterBlockTypes } from "../lib/blockTypes.js";
import { computeHiddenBlockIds, findParentIndex, getSubtreeRange, isBlockContentEmpty, isContainerBlock } from "../lib/blockTree.js";
import { getCaretVisualEdge, isCaretAtEdge, isEntireContentSelected, placeCaretNearPoint, splitContentAtCaret } from "../lib/caret.js";
import { toggleBold, toggleInlineCode, toggleItalic, toggleLink, toggleStrike, toggleUnderline } from "../RichTextInput.jsx";

// 블록 안에서 글자를 편집하는 중 누른 키(Enter·Backspace·Tab·방향키·단축키 등)를 처리하는 핸들러 팩토리예요.
// BlockEditor가 매 렌더마다 최신 상태·함수를 담은 ctx를 넘겨서 부르니, 반환된 핸들러는 예전에
// BlockEditor 안에 있을 때와 똑같이 "가장 최근 렌더의 클로저"로 동작해요.
export default function createBlockKeyDownHandler(ctx) {
  const {
    blockTypeOptions,
    blocks,
    convertBlock,
    deleteBlock,
    duplicateBlock,
    focusBlock,
    handleRedo,
    handleUndo,
    indentBlock,
    inputRefs,
    insertBlockAfter,
    insertEmptyBlockBefore,
    keepCaret,
    mergeNextIntoCurrent,
    mergeWithPrevious,
    moveBlock,
    openLinkPopover,
    outdentBlock,
    pushUndoSnapshot,
    selectionAnchorIdRef,
    setSelectedBlockIds,
    setSlashIndex,
    setSlashMenu,
    slashIndex,
    slashMenu,
    updateBlock,
  } = ctx;

  return (e, block) => {
    // 요청: "한글 입력 중 Enter" — 한글/일본어 같은 IME는 글자를 조합하는 동안(아직 확정 전)
    // Enter/Backspace/방향키도 조합을 확정·수정하는 데 써요. 이때 우리 단축키가 같이 반응하면
    // 마지막 글자가 새 블록으로 튀거나 빈 블록이 하나 더 생겨요 — 조합 중에는 전부 브라우저에
    // 맡겨요(keyCode 229는 일부 브라우저가 조합 중 키 이벤트에 붙이는 표시).
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;

    // 노션처럼 Ctrl+A를 처음 누르면 이 블록의 글자 전체를, 이미 전부 선택된(또는 빈) 상태에서 한 번
    // 더 누르면 페이지의 모든 블록을 선택해요.
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "a") {
      if (isEntireContentSelected(e.currentTarget)) {
        e.preventDefault();
        e.currentTarget.blur?.();
        window.getSelection()?.removeAllRanges();
        const visible = blocks.filter((b) => !computeHiddenBlockIds(blocks).has(b.id));
        setSelectedBlockIds(new Set(visible.map((b) => b.id)));
        selectionAnchorIdRef.current = visible[0]?.id ?? null;
        return;
      }
    }

    // 글자를 편집하는 중에도 쓸 수 있는 노션 단축키:
    //  - Ctrl+Enter: 할 일은 체크 토글, 토글 목록은 펼치기/접기.
    //  - Ctrl+D: 이 블록(과 자식)을 복제.
    //  - Ctrl+Shift+↑/↓: 이 블록(과 자식)을 위/아래로 이동(커서는 그대로).
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (block.type === "TODO") {
          pushUndoSnapshot();
          updateBlock(block.id, { checked: !block.checked });
        } else if (block.type === "TOGGLE") updateBlock(block.id, { collapsed: !block.collapsed });
        return;
      }
      if (k === "d" && !e.shiftKey) {
        e.preventDefault();
        duplicateBlock(block.id);
        return;
      }
      if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const restore = keepCaret(block.id);
        moveBlock(block.id, e.key === "ArrowUp" ? "up" : "down");
        restore();
        return;
      }
    }

    // Delete: 블록 맨 끝에서 누르면 다음 블록을 이어붙여요.
    if (
      e.key === "Delete" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      block.type !== "CODE" &&
      RICH_TEXT_TYPES.includes(block.type) &&
      !block.pageId &&
      isCaretAtEdge(e.currentTarget, "end")
    ) {
      if (mergeNextIntoCurrent(block)) {
        e.preventDefault();
        return;
      }
    }

    // 요청: "인라인 서식" — 노션과 같은 단축키(Ctrl/Cmd+B/I/U, Ctrl/Cmd+
    // Shift+S, Ctrl/Cmd+E, Ctrl/Cmd+K)로 굵게/기울임/밑줄/취소선/인라인
    // 코드/링크를 토글해요. 리치 텍스트를 지원하는 블록(RICH_TEXT_TYPES)
    // 위에서만 동작해요 — 코드 블록은 그대로 순수 텍스트라 서식이라는
    // 개념이 없어요. e.currentTarget이 곧 그 블록의 contentEditable div
    // 예요(RichTextInput이 그대로 넘겨준 onKeyDown이라).
    if (RICH_TEXT_TYPES.includes(block.type) && (e.metaKey || e.ctrlKey)) {
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        toggleBold();
        return;
      }
      if (key === "i") {
        e.preventDefault();
        toggleItalic();
        return;
      }
      if (key === "u") {
        e.preventDefault();
        toggleUnderline();
        return;
      }
      if (key === "e") {
        e.preventDefault();
        toggleInlineCode(e.currentTarget);
        return;
      }
      if (key === "k") {
        e.preventDefault();
        toggleLink(e.currentTarget, (rootEl) => openLinkPopover([{ rootEl }]));
        return;
      }
      if (e.shiftKey && key === "s") {
        e.preventDefault();
        toggleStrike();
        return;
      }
    }

    // 요청: "블록 생성에 대한 ctrl z" — 글자를 치고 있는 중에도 브라우저 기본
    // 되돌리기(글자 단위, 블록 생성은 못 되돌림) 대신 우리 실행 취소 기록을
    // 써요. 글자 입력도 1초 단위로 묶여서 기록되니, 방금 Enter로 만든 블록도
    // 글자와 함께 차례로 되돌아가요. Ctrl+Shift+Z / Ctrl+Y는 다시 실행이에요.
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const zKey = e.key.toLowerCase();
      // stopPropagation: 되돌리기로 이 블록이 사라지면(예: 방금 붙여넣거나 Enter로 만든 블록) React가
      // 이벤트가 window에 닿기 전에 다시 그려서 포커스가 body로 빠져요. 그러면 window의 "편집 중이
      // 아닐 때" 되돌리기가 같은 키 입력에 한 번 더 실행돼 두 단계가 한꺼번에 되돌아가요.
      if (zKey === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo(block.id);
        return;
      }
      if ((zKey === "z" && e.shiftKey) || zKey === "y") {
        e.preventDefault();
        e.stopPropagation();
        handleRedo(block.id);
        return;
      }
    }

    // 제목·할 일·목록처럼 원래 한 줄짜리였던 타입은 <input>일 땐 애초에
    // Shift+Enter를 쳐도 줄바꿈이 안 됐어요(브라우저가 input 안 줄바꿈을
    // 막아줬으니까). contentEditable div로 바뀌면서 그 보장이 없어져서,
    // 여기서 직접 막아 예전과 똑같이 한 줄만 유지해요. TEXT/QUOTE(원래도
    // 여러 줄 가능했던 AutoTextarea)는 그대로 Shift+Enter로 줄바꿈돼요.
    if (e.key === "Enter" && e.shiftKey && !MULTILINE_TYPES.includes(block.type)) {
      e.preventDefault();
      return;
    }

    const isSlashOpen = slashMenu?.blockId === block.id;

    // 슬래시 메뉴가 떠 있으면: 위/아래 화살표로 후보를 옮기고, Enter(또는
    // Tab)로 마우스 없이 바로 그 블록 타입을 적용해요. "/h1", "/제목1"처럼
    // 정확히 쳤다면 필터링된 목록 맨 위(= 0번)가 바로 그 타입이라 Enter만
    // 눌러도 곧장 적용돼요.
    if (isSlashOpen) {
      const filtered = filterBlockTypes(blockTypeOptions, slashMenu.query);

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (filtered.length > 0) {
          e.preventDefault();
          setSlashIndex((i) => {
            const delta = e.key === "ArrowDown" ? 1 : -1;
            return (i + delta + filtered.length) % filtered.length;
          });
        }
        return;
      }

      if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
        if (filtered.length > 0) {
          e.preventDefault();
          const chosen = filtered[Math.min(slashIndex, filtered.length - 1)];
          convertBlock(block.id, chosen.type);
          return;
        }

        // 일치하는 블록이 없으면 메뉴만 닫고, Enter는 아래 일반 처리로
        // 흘려보내요(새 블록을 추가하는 평소 동작).
        setSlashMenu(null);
      }

      if (e.key === "Escape") {
        // 메뉴만 닫고 커서는 그대로 둬요 — window의 Esc 처리(블록 선택 모드로 전환하며 blur)까지
        // 가지 않게 여기서 전파를 끊어요.
        e.preventDefault();
        e.stopPropagation();
        setSlashMenu(null);
        return;
      }
    }

    // 요청: "방향키로 블록 사이 이동" — 블록마다 따로 편집 영역(contentEditable)이라 브라우저
    // 기본 동작으로는 ↑/↓/←/→가 블록 경계를 못 넘어요. 커서가 블록의 맨 앞/끝(←/→)이거나 첫/
    // 마지막 줄(↑/↓)일 때 보이는 이웃 편집 블록(접힌 토글 안·카드·구분선은 건너뜀)으로
    // 커서를 옮겨요. ↑/↓는 가로 위치를 최대한 유지해요.
    if (
      !isSlashOpen &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      const el = e.currentTarget;
      let dir = 0;
      let where = "start";
      let x = null;
      if (e.key === "ArrowLeft" && isCaretAtEdge(el, "start")) {
        dir = -1;
        where = "end";
      } else if (e.key === "ArrowRight" && isCaretAtEdge(el, "end")) {
        dir = 1;
        where = "start";
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const edge = getCaretVisualEdge(el);
        if (edge && e.key === "ArrowUp" && edge.first) {
          dir = -1;
          where = "end";
          x = edge.x;
        } else if (edge && e.key === "ArrowDown" && edge.last) {
          dir = 1;
          where = "start";
          x = edge.x;
        }
      }
      if (dir !== 0) {
        const hidden = computeHiddenBlockIds(blocks);
        let i = blocks.findIndex((b) => b.id === block.id) + dir;
        while (i >= 0 && i < blocks.length) {
          const cand = blocks[i];
          const candEl = inputRefs.current[cand.id];
          if (!hidden.has(cand.id) && !cand.pageId && candEl && candEl.isConnected) {
            e.preventDefault();
            placeCaretNearPoint(candEl, x, where);
            return;
          }
          i += dir;
        }
      }
    }

    // 요청: "블록 중첩/들여쓰기" — 노션과 같은 단축키(Tab/Shift+Tab)로
    // 블록을 들여쓰기/내어쓰기 해요. 슬래시 메뉴가 열려있을 땐 위에서
    // 이미 Tab을 "선택된 타입 적용"으로 쓰니, 메뉴가 닫혀있을 때만
    // 여기서 처리해요.
    // (슬래시 메뉴가 열려 있어도 후보가 없거나 Shift+Tab이면 위에서 처리되지 않고 여기까지 와요 — 그때도 Tab이
    // 브라우저 기본 동작(포커스가 에디터 밖으로 나감)으로 새지 않게 막고, 메뉴는 닫아요.)
    if (e.key === "Tab") {
      if (isSlashOpen) setSlashMenu(null);
      e.preventDefault();
      if (e.shiftKey) outdentBlock(block.id);
      else indentBlock(block.id);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && block.type !== "CODE") {
      e.preventDefault();

      const isEmpty = isBlockContentEmpty(block.content);

      if (LIST_TYPES.includes(block.type) && isEmpty) {
        pushUndoSnapshot();
        updateBlock(block.id, { type: "TEXT" });
        return;
      }

      const blockIndex = blocks.findIndex((b) => b.id === block.id);
      const parentIndex = findParentIndex(blocks, blockIndex);
      const parentBlock = parentIndex === -1 ? null : blocks[parentIndex];

      // 콜아웃/인용/토글 안의 "마지막" 빈 문단에서 Enter를 치면 박스에서
      // 빠져나와요(한 단 내어쓰기) — 안 그러면 박스 안에서 새 줄이 끝없이
      // 이어지기만 해서 박스 바깥으로 나올 방법이 없어요.
      if (
        parentBlock &&
        (isContainerBlock(parentBlock) || parentBlock.type === "TOGGLE") &&
        block.type === "TEXT" &&
        isEmpty &&
        getSubtreeRange(blocks, parentIndex) === getSubtreeRange(blocks, blockIndex)
      ) {
        outdentBlock(block.id);
        return;
      }

      // 요청: "콜아웃/인용을 노션처럼" + "자식이 있는 블록에서 Enter" — 새 블록이 "박스/자식
      // 영역 안"(첫 번째 자식)으로 들어가야 하는 경우: 콜아웃(항상), 펼쳐진 토글, 그리고
      // 자식이 이미 있는 블록. 새 블록이 부모와 자식 사이에 끼면 기존 자식이 새 블록의
      // 자식으로 딸려가 버려서, 이런 블록들은 항상 첫 자식으로 넣어요. 접힌 토글은 자식이
      // 숨겨져 있어서 자식 전체 뒤에 같은 단으로 새 블록을 만들어요(insertBlockAfter 기본).
      const hasChildren = (blocks[blockIndex + 1]?.indent || 0) > (block.indent || 0);
      const collapsedToggle = block.type === "TOGGLE" && !!block.collapsed;
      const goesInside =
        block.type === "CALLOUT" || (block.type === "TOGGLE" && !collapsedToggle) || (hasChildren && !collapsedToggle);
      const continueType = LIST_TYPES.includes(block.type) ? block.type : "TEXT";

      // 요청: "텍스트 중간에서 Enter" — 커서 위치에서 줄을 쪼개요(선택 영역이 있으면 지우고
      // 쪼개요). 뒷부분은 새 블록으로, 앞부분은 현재 블록에 남아요. 맨 앞에서 Enter면 글자는
      // 그대로 두고 위에 빈 블록만 끼워요(노션과 같아요).
      const split = isEmpty ? null : splitContentAtCaret(e.currentTarget);
      if (split) {
        const beforeEmpty = isBlockContentEmpty(split.before);
        const afterEmpty = isBlockContentEmpty(split.after);
        if (beforeEmpty && !afterEmpty) {
          // 맨 앞부터 일부를 선택한 채 Enter면 선택한 글자는 지워지고 위에 빈 블록이 끼어요.
          if (split.after !== block.content) updateBlock(block.id, { content: split.after });
          insertEmptyBlockBefore(block.id, LIST_TYPES.includes(block.type) ? block.type : "TEXT");
          return;
        }
        if (!afterEmpty) {
          insertBlockAfter(block.id, continueType, {
            asChild: goesInside,
            content: split.after,
            selfContent: split.before,
            caret: "start",
          });
          return;
        }
      }

      insertBlockAfter(block.id, continueType, {
        asChild: goesInside,
        selfContent: split && split.before !== block.content ? split.before : undefined,
      });
      return;
    }

    // 요청: "블록 맨 앞에서 Backspace" — 노션과 같아요. 제목·목록·인용 같은 특수 블록은 먼저 일반
    // 텍스트로 바뀌고, 들여쓰기된 텍스트는 한 단 내어쓰고, 최상위 텍스트는 바로 위 블록 끝에
    // 이어붙어요(커서는 이어붙은 자리에 남아요).
    if (
      e.key === "Backspace" &&
      block.type !== "CODE" &&
      !block.pageId &&
      !isBlockContentEmpty(block.content) &&
      isCaretAtEdge(e.currentTarget, "start")
    ) {
      e.preventDefault();
      if (block.type !== "TEXT") {
        pushUndoSnapshot();
        updateBlock(block.id, { type: "TEXT", ...(block.type === "CALLOUT" ? { color: null } : {}) });
        focusBlock(block.id, "start");
        return;
      }
      if ((block.indent || 0) > 0) {
        outdentBlock(block.id);
        return;
      }
      mergeWithPrevious(block);
      return;
    }

    // 요청: "들여쓰기 상태에서 enter를 쳐서 아래줄로 간 뒤 backspace를
    // 누르면 들여쓰기 전 상태로 가야 하는데 줄이 사라진다" — 노션
    // 참고: 노션은 빈 블록에서 Backspace를 누르면, 들여쓰기가 남아있는
    // 동안엔 블록을 지우지 않고 먼저 한 단씩 내어쓰기만 해요(커서가
    // 있던 그 줄은 그대로 남고 부모 밖으로 한 단 빠져나와요). 맨 위
    // 단(들여쓰기 0)까지 다 내어쓴 다음에야, 그다음 Backspace가 비로소
    // 그 블록 자체를 지워요(그리고 바로 앞 블록으로 커서가 이동).
    if (e.key === "Backspace" && isBlockContentEmpty(block.content)) {
      // 요청: "콜아웃/인용을 노션처럼" — 빈 콜아웃/인용에서 Backspace는 박스
      // 자체를 없애는 게 아니라 먼저 일반 텍스트로 바꿔요(안에 자식이 있어도
      // 사라지지 않아요). 텍스트가 된 다음 Backspace부터는 평소 규칙대로예요.
      // 요청: "글머리/번호/할 일에서 Backspace" — 빈 목록·할 일·제목·토글도 콜아웃/인용처럼 먼저
      // 일반 텍스트로 바뀌어요(들여쓰기는 그대로). 그다음 Backspace부터 평소 규칙(내어쓰기 →
      // 삭제)이에요.
      if (block.type !== "TEXT" && RICH_TEXT_TYPES.includes(block.type)) {
        e.preventDefault();
        pushUndoSnapshot();
        updateBlock(block.id, { type: "TEXT", ...(block.type === "CALLOUT" ? { color: null } : {}) });
        focusBlock(block.id);
        return;
      }

      if ((block.indent || 0) > 0) {
        e.preventDefault();
        outdentBlock(block.id);
        return;
      }

      if (blocks.length > 1) {
        e.preventDefault();
        deleteBlock(block.id, { keepChildren: true });
        return;
      }
    }
  };
}
