import { Fragment, cloneElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  stripHtml,
  sanitizeInlineHtml,
  escapePlainTextToHtml,
  getActiveMarks,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  toggleInlineCode,
  toggleLink,
  isMarkActiveAcrossBlocks,
  applyMarkAcrossBlocks,
  normalizeLinkUrl,
  applyInlineColor,
} from "./RichTextInput";
import SelectionToolbar, { LinkPopover } from "./SelectionToolbar";
import { BLOCK_TYPES, BLOCK_COLORS, BLOCK_TEXT_COLORS, blockCanHaveBackground, blockCanHaveTextColor, blockPaintKey, LIST_TYPES, RICH_TEXT_TYPES } from "./lib/blockTypes.js";
import { isBlockContentEmpty, getSubtreeRange, getSubtreeIds, findParentIndex, getDirectChildrenIndices, resolveGroupColor, normalizeIndents, computeHiddenBlockIds, isContainerBlock, computeContainerOwners, collectColorTargetIds, expandSelectionWithSubtrees, computeNumbers } from "./lib/blockTree.js";
import { captureCaretOffset, restoreCaretOffset, splitContentAtCaret } from "./lib/caret.js";
import { matchMarkdownShortcut, parseMarkdownLine, BLOCKS_CLIPBOARD_TYPE } from "./lib/blockClipboard.js";
import BlockRow from "./BlockRow";
import { CURRENT_USER_NAME } from "./lib/comments.js";
import { useAuth } from "../../context/useAuth";
import { formatFileSize } from "./blocks/MediaBlocks";
import { getOwnedPageIds, createEmptyBlock, createDefaultDatabase, createSimpleTable, normalizeBlockShape } from "./lib/blockFactory.js";
import useBlockHistory from "./hooks/useBlockHistory.js";
import useDialog from "../../context/useDialog.js";
import useBlockSelectionState from "./hooks/useBlockSelectionState.js";
import useBlockSelectionShortcuts from "./hooks/useBlockSelectionShortcuts.js";
import createBlockKeyDownHandler from "./hooks/blockKeyDown.js";
import useMultiBlockTextSelection from "./hooks/useMultiBlockTextSelection.js";
import { selectionTextBounds } from "./lib/selectionMove.js";

// 기본값으로 매 렌더마다 새 배열([])을 만들면 memo된 BlockRow의 props가 항상 "달라져" 보여요.
const NO_PAGES = [];
const NO_TASKS = [];
const NO_REMOTE_EDITORS = {};

export default function BlockEditor({
  blocks: initialBlocks,
  onChange,
  pages = NO_PAGES,
  onCreateChildPage,
  onRenameRowPage,
  onDeleteRowPage,
  onDuplicatePage,
  // 서버에 만드는 중이던 임시 페이지 id → 실제 id. 하위 페이지 링크 블록은 임시 id를 들고 있을 수 있어서
  // 페이지를 찾을 때만 실제 id로 이어줘요(블록 데이터는 그대로 둬서 실행 취소와 안 부딪혀요).
  pageIdMap,
  // 작업 임베드 블록이 고를 수 있는 작업 목록과 하위 작업 체크 함수예요. 상위(PageDetailPage → MainLayout)가
  // 작업 상태를 들고 있다가 내려줘요. 안 넘어오면 빈 목록이라 작업 블록은 선택할 게 없어요.
  sprintTasks = NO_TASKS,
  onToggleSubtask,
  // 같은 페이지의 다른 멤버가 편집 중인 블록: { 블록 id: [{ userId, name, initial }] } — 그 줄에 이름표만 보여줘요.
  remoteEditors = NO_REMOTE_EDITORS,
  // 다른 멤버가 저장한 내용을 합친 블록 배열을 통째로 화면에 넣는 함수를 여기에 등록해 둬요(usePageBlocks가 불러요).
  applyRef,
}) {
  const { confirm } = useDialog();
  // pages/{pageId}/blocks API로 교체 예정. onChange가 있으면 상위(페이지 목록
  // 상태)로 변경 사항을 올려서 다른 화면에서도 최신 블록이 보이게 해요.
  //
  // 요청: "인라인 서식" — 이 기능이 생기기 전에 저장된 블록은 content가
  // 순수 문자열이라, 혹시 <, >, & 같은 글자를 그대로 담고 있으면(예:
  // "a < b") contentEditable의 innerHTML에 그대로 부었을 때 태그
  // 시작으로 오인돼 내용이 깨져요. 그래서 처음 불러올 때 딱 한 번만
  // (마운트 시점에만 도는 useState 초기화 함수 안에서) escapePlainTextToHtml로
  // 안전하게 이스케이프하고 richText:true를 붙여요 — 그 뒤로는 이미
  // "올바른 HTML"이라는 표시가 남아서 다시 이 변환을 타지 않아요(또
  // 거치면 "&"가 "&amp;"로 이중 이스케이프돼요). BlockEditor는
  // PageDetailPage.jsx에서 key={page.id}로 페이지를 옮길 때마다 통째로
  // 새로 마운트되니, 이 초기화는 페이지를 열 때마다 정확히 한 번씩만
  // 실행돼요.
  const [blocks, setBlocksState] = useState(() =>
    // 바깥에서 온 값이라 모양(type 없음 등)을 바로잡고 서식 HTML도 한 번 걸러서 시작해요(normalizeBlockShape).
    initialBlocks.map(normalizeBlockShape).filter(Boolean),
  );
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, query }
  const [slashIndex, setSlashIndex] = useState(0); // 슬래시 메뉴에서 키보드로 고른 항목
  const [blockMenu, setBlockMenu] = useState(null); // { blockId, mode: "main" | "convert" }
  const [commentPanel, setCommentPanel] = useState(null); // 댓글 패널이 열려있는 blockId
  const [focusedBlockId, setFocusedBlockId] = useState(null); // 안내 문구는 커서 있는 블록에만

  // 블록 순서를 마우스로 드래그해서 바꾸는 기능 — 칸반 보드의 카드/컬럼
  // 드래그와 완전히 같은 방식이에요(왼쪽에 드래그 핸들이 있고, 호버 중인
  // 블록의 2/3 지점을 넘었는지에 따라 그 블록 앞/뒤로 놓일 위치가
  // 정해지고, 파란 줄(.block-drop-indicator)로 보여줘요). 드래그 중엔
  // 배열을 안 건드리고 목표 위치(blockDropTarget)만 들고 있다가, 드롭할
  // 때 한 번만 실제로 순서를 바꿔요(commitBlockDrop) — 칸반과 달리 여기는
  // 컬럼 구분 없이 blocks 배열 하나뿐이라 statusId 같은 건 필요 없어요.
  const [dragBlockId, setDragBlockId] = useState(null);
  const [blockDropTarget, setBlockDropTarget] = useState(null); // { beforeBlockId }
  // 드래그 시작 시점에 여러 블록이 선택돼 있고(selectedBlockIds.size > 1)
  // 그중 하나의 핸들을 잡아 드래그한 거라면, 선택된 블록 전체를 "그룹"으로
  // 같이 옮겨야 해요(요청: 범위 선택 후 위치 이동하면 하나만 움직이는 버그
  // 수정). dragBlockId는 여전히 "손으로 잡은 블록"(핸들 표시·자기자신 제외
  // 판정의 기준점)이고, draggedGroupIds는 "실제로 같이 움직일 블록 id들"
  // 이에요 — 단일 블록만 드래그할 때는 항상 {dragBlockId} 하나짜리 집합이라
  // 기존 동작과 완전히 동일해요.
  const [draggedGroupIds, setDraggedGroupIds] = useState(() => new Set());

  // 요청: 노션처럼 "빈 공간에서 드래그하면 여러 블록을 한 번에 선택"할
  // 수 있어야 하고, 반대로 텍스트 위(포인터가 I-beam 커서일 때)에서
  // 드래그하면 그냥 브라우저 기본 텍스트 선택이 되어야 해요. 그래서
  // mousedown이 실제 텍스트 요소(input/textarea 등, 아래
  // handleSelectionMouseDown 참고) 위에서 시작했는지로 둘을 갈라요 —
  // 아니면 사각형 드래그 선택을 시작하고, 드래그 사각형과 겹치는
  // .block-row들의 id를 selectedBlockIds에 모아요. 블록 순서를 바꾸는
  // 위 드래그(dragBlockId, 핸들 전용 HTML5 드래그)와는 완전히 별개
  // 메커니즘(마우스 이벤트 기반)이라 서로 안 부딪혀요.
  const {
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
  } = useBlockSelectionState();
  const editorRef = useRef(null);
  // 버그 수정(요청: "드래그를 끝내고 마우스에서 손을 뗄 때 인라인
  // 편집기가 떠야 하는데, 드래그하는 도중에 블록을 넘어갈 때마다 툴바가
  // 생겼다 사라진다") — 아래 selectionchange 리스너는 브라우저가
  // "선택이 바뀌었다"고 알려줄 때마다(마우스가 한 픽셀만 움직여도,
  // 블록 경계를 넘는 순간에도) 매번 다시 계산해서 툴바를 열고 닫아요.
  // 그래서 드래그 중에는 이 리스너를 잠깐 꺼두고(이 ref로 "지금 드래그
  // 중"임을 표시), 마우스를 뗀 순간(handleUp)에 딱 한 번만 최종 선택
  // 범위로 툴바를 계산해서 띄워요 — 원래 요청대로 "드래그를 끝내야"
  // 뜨게 되는 거예요.
  const textSelectionDraggingRef = useRef(false);
  // 요청: "여러 블록 선택하고 핸들 버튼 이용이 가능하게" — 선택된 블록이
  // 2개 이상일 때, 그중 하나의 핸들(⋯)을 누르면 이 일괄 메뉴가 열려요
  // ({ anchorBlockId: 눌린 블록, mode: "main" | "color" | "textColor" }).
  // 아래 blocks.map의 onToggleMore가 selectedBlockIds 크기를 보고
  // blockMenu(단일)와 bulkMenu(일괄) 중 뭘 열지 갈라요.
  const [bulkMenu, setBulkMenu] = useState(null);

  // 요청: "인라인 서식" — 텍스트를 드래그로 선택하면 그 위에 뜨는 서식
  // 툴바(SelectionToolbar.jsx)의 상태예요. { blockId, rect(뷰포트 좌표),
  // rootEl(그 블록의 contentEditable DOM) } — rect는 툴바 위치 계산에,
  // rootEl은 지금 선택이 이미 어떤 서식(굵게 등) 안에 있는지 판정하고
  // 인라인 코드·링크를 토글할 때 필요해요. 아래 selectionchange 리스너가
  // 채워요.
  const [selectionToolbar, setSelectionToolbar] = useState(null);
  // 링크 URL 입력 팝오버 상태 — { rect, blocks:[{rootEl}], range }. 팝오버의 입력창이 포커스를 가져가도
  // 원래 선택 범위(range)를 기억해뒀다가 적용/취소할 때 되돌려요.
  const [linkPopover, setLinkPopover] = useState(null);

  const inputRefs = useRef({});
  const idCounter = useRef(Math.max(0, ...initialBlocks.map((b) => b.id)) + 1);

  // PAGE 블록은 pageId만 들고 있고, 제목·아이콘은 항상 최신 pages 상태에서
  // 찾아 그려요 — 하위 페이지 제목을 바꿔도 부모 쪽 블록이 따로 갱신될
  // 필요가 없게.
  const pagesById = Object.fromEntries(pages.map((p) => [p.id, p]));
  // 데이터베이스 행도 임시 페이지 id를 들고 있을 수 있어서, 같은 별칭 항목(id는 임시 id 그대로)을 목록에 더해 줘요.
  let pagesForDb = pages;
  if (pageIdMap) {
    const aliases = [];
    for (const [tempId, realId] of Object.entries(pageIdMap)) {
      if (pagesById[realId] && !pagesById[tempId]) {
        pagesById[tempId] = pagesById[realId];
        aliases.push({ ...pagesById[realId], id: Number(tempId) });
      }
    }
    if (aliases.length > 0) pagesForDb = [...pages, ...aliases];
  }

  // 하위 페이지를 만들 수 없는 컨텍스트(onCreateChildPage 미전달)에서는
  // "하위 페이지" 메뉴 항목 자체를 숨겨요.
  const blockTypeOptions = useMemo(
    () => (onCreateChildPage ? BLOCK_TYPES : BLOCK_TYPES.filter((item) => item.type !== "CHILD_PAGE")),
    [onCreateChildPage],
  );

  // 성능: 글자 하나를 칠 때마다 모든 블록 행(BlockRow)이 다시 그려지면 블록이 수백 개인 페이지에서 입력이
  // 느려져요. BlockRow를 memo로 감싸되, 행마다 새로 만들어지는 핸들러 함수가 매번 "다른 props"로 보이지
  // 않도록 아래 stabilizeRowProps가 함수 props를 (행 id, prop 이름)별로 고정된 래퍼로 바꿔요. 래퍼는
  // 항상 "가장 최근 렌더의 함수"를 호출하니, 다시 그려지지 않은 행이 오래된 state를 붙잡는 일이 없어요.
  const stableFnsRef = useRef(new Map()); // 블록 id -> { propName: { fn, wrap } }
  // 지워진 블록의 래퍼가 계속 쌓이지 않게(오래된 렌더의 클로저를 붙잡고 있어요) 블록 개수가 바뀔 때 정리해요.
  useEffect(() => {
    const alive = new Set(blocks.map((b) => b.id));
    for (const id of stableFnsRef.current.keys()) {
      if (!alive.has(id)) stableFnsRef.current.delete(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);
  const stabilizeRowProps = (id, props) => {
    let cache = stableFnsRef.current.get(id);
    if (!cache) {
      cache = {};
      stableFnsRef.current.set(id, cache);
    }
    const out = {};
    for (const key in props) {
      const value = props[key];
      if (typeof value === "function") {
        let entry = cache[key];
        if (!entry) {
          entry = { fn: value, wrap: null };
          entry.wrap = (...args) => entry.fn(...args);
          cache[key] = entry;
        }
        entry.fn = value;
        out[key] = entry.wrap;
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  // (아래 useBlockHistory가 돌려주는 lastPushRef/revertSnapshot을 쓰는데, 훅이 이 함수보다 뒤에 선언돼서
  // ref로 한 번 건너 불러요.)
  const historyApiRef = useRef(null);
  const setBlocks = (updater) => {
    // 이 호출 직전에 쌓은 Undo 스냅샷(있다면) — 결과가 아무 변화 없으면 그 스냅샷을 거둬요.
    const pushRec = historyApiRef.current?.lastPushRef.current;
    setBlocksState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // 요청: "블록 중첩/들여쓰기" — 드래그로 순서 바꾸기·삭제·복제·
      // 이동 등 구조가 바뀌는 모든 변경이 다 이 setBlocks를 거쳐가니,
      // 여기 한 곳에서 normalizeIndents를 걸어두면 어떤 조작을 하든
      // indent가 "부모 없이 붕 뜬" 상태(예: 들여쓴 자식만 남기고 부모를
      // 지우거나, 드래그로 순서를 옮겨서 바로 앞 블록보다 2단 이상
      // 깊어지는 경우)가 되지 않아요 — 매번 개별 함수마다 따로 정리해줄
      // 필요가 없어요.
      const normalized = normalizeIndents(next);
      if (pushRec && pushRec.snapshot === prev && normalized === prev) historyApiRef.current.revertSnapshot(pushRec);
      return normalized;
    });
  };

  // 부모(onChange)에게 알리는 건 상태 업데이트 함수 "안"이 아니라 여기 효과에서 해요 —
  // 업데이트 함수는 순수해야 해서(React가 두 번 부를 수도 있어요), 부모의 setState를 그
  // 안에서 부르면 중복 호출/경고가 생길 수 있어요. 처음 마운트 때는 (아무것도 안 바뀌었으니)
  // 알리지 않아요.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onChange?.(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // 실행 취소/다시 실행 기록 — 자세한 설명은 hooks/useBlockHistory.js 참고.
  // 스냅샷을 되돌린 뒤 선택·메뉴 상태를 비우고, 커서를 살아남은 블록(없으면 바로 위 블록)으로 보내요.
  const history = useBlockHistory({
    blocks,
    setBlocksState,
    onRestore: (target, focusId, oldIndex) => {
      // 되돌린 뒤에는 이미 사라졌을 수도 있는 id를 계속 들고 있지 않게 선택·메뉴 상태도 같이 정리해요.
      setSelectedBlockIds(new Set());
      selectionAnchorIdRef.current = null;
      setBulkMenu(null);
      setBlockMenu(null);
      if (focusId != null) {
        const survivor = target.find((b) => b.id === focusId) || target[Math.max(0, Math.min(oldIndex - 1, target.length - 1))];
        if (survivor && RICH_TEXT_TYPES.concat(["CODE"]).includes(survivor.type)) focusBlock(survivor.id);
      }
    },
  });

  const { pushUndoSnapshot, pushTextUndoSnapshot, handleUndo, handleRedo } = history;
  historyApiRef.current = history;

  const nextId = () => idCounter.current++;

  // 다른 멤버의 변경을 합친 결과를 받아 화면에 넣어요. 서버 id를 그대로 받아온 새 블록과 id가 겹치지 않게 카운터도 올려요.
  useEffect(() => {
    if (!applyRef) return undefined;

    applyRef.current = (next, rebase) => {
      if (rebase) history.rebaseHistory(rebase);
      idCounter.current = Math.max(idCounter.current, ...next.map((b) => Number(b.id) || 0)) + 1;
      setBlocks(() => next);
    };

    return () => {
      applyRef.current = null;
    };
  });

  const openLinkPopover = (blocksForLink) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0).cloneRange();
    const r = range.getBoundingClientRect();
    setLinkPopover({ rect: { top: r.top, bottom: r.bottom, left: r.left }, blocks: blocksForLink, range });
  };

  const restoreLinkSelection = (pop) => {
    if (pop.blocks.length === 1) pop.blocks[0].rootEl?.focus({ preventScroll: true });
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(pop.range);
  };

  const submitLink = (raw) => {
    const pop = linkPopover;
    setLinkPopover(null);
    if (!pop) return;
    const url = normalizeLinkUrl(raw);
    restoreLinkSelection(pop);
    if (!url) return;
    if (pop.blocks.length === 1) {
      document.execCommand("createLink", false, url);
    } else {
      applyMarkAcrossBlocks("a", pop.blocks, {
        mode: "on",
        attrs: { href: url, target: "_blank", rel: "noreferrer" },
      });
    }
  };

  const cancelLink = () => {
    const pop = linkPopover;
    setLinkPopover(null);
    if (pop) restoreLinkSelection(pop);
  };

  // position: "end"(기본) | "start" — 새로 만든/이동한 블록에서 커서를 둘 자리.
  const focusBlock = (id, position = "end") => {
    requestAnimationFrame(() => {
      const el = inputRefs.current[id];
      if (!el) return;
      el.focus();
      const atStart = position === "start";
      if (typeof el.setSelectionRange === "function") {
        const pos = atStart ? 0 : el.value.length;
        el.setSelectionRange(pos, pos);
      } else if (el.isContentEditable) {
        // RICH_TEXT_TYPES 블록은 <input>이 아니라 contentEditable div라
        // setSelectionRange가 없어요 — Selection/Range API로 커서를
        // 내용 맨 끝(또는 맨 앞)에 둬요.
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(atStart);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  };

  // 호출 시점의 커서 위치를 기억해두고, 돌려준 함수를 (상태 변경 직후) 실행하면 다시
  // 그려진 같은 블록에 같은 커서 위치로 포커스를 되돌려요.
  const keepCaret = (id) => {
    const offset = captureCaretOffset(inputRefs.current[id]);
    return () => {
      if (offset === null) return;
      requestAnimationFrame(() => {
        const el = inputRefs.current[id];
        if (el) restoreCaretOffset(el, offset);
      });
    };
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  // id는 Date.now()로 충분해요(같은 브라우저 세션 안에서만 구분되면
  // 되는 로컬 상태라 충돌 걱정이 없어요).
  const me = useAuth()?.user ?? null;

  const addComment = (blockId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              comments: [
                ...(b.comments || []),
                { id: Date.now(), userId: me?.id, author: me?.nickname || CURRENT_USER_NAME, text: trimmed, createdAt: new Date().toISOString() },
              ],
            }
          : b,
      ),
    );
  };

  // ⋯ 메뉴는 본인(CURRENT_USER_NAME) 댓글에서만 열리니까 여기서 작성자를
  // 다시 확인할 필요는 없지만(BlockRow가 이미 걸러줌), editedAt을 같이
  // 찍어서 "(수정됨)" 표시를 붙일 수 있게 해요.
  const editComment = (blockId, commentId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              comments: (b.comments || []).map((c) =>
                c.id === commentId ? { ...c, text: trimmed, editedAt: new Date().toISOString() } : c,
              ),
            }
          : b,
      ),
    );
  };

  const deleteComment = (blockId, commentId) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, comments: (b.comments || []).filter((c) => c.id !== commentId) } : b,
      ),
    );
  };

  // asChild가 true면 새 블록을 ref의 "첫 번째 자식"(indent + 1)으로 넣어요 —
  // 콜아웃 안에서 Enter를 치거나, 펼쳐진 자식이 있는 블록에서 Enter를 칠 때 쓰는
  // 방식이에요(이미 자식이 있으면 그 맨 앞에 끼어들어요). asChild가 아니면 ref의 "자식
  // 전체 뒤"(getSubtreeRange)에 같은 단으로 넣어서, 자식이 새 블록의 자식으로 딸려가는
  // 일이 없어요. content는 새 블록의 내용(Enter로 줄을 쪼갤 때의 뒷부분), selfContent는
  // 같은 변경 안에서 ref 자신의 내용을 앞부분으로 줄이는 데 써요(undo 한 번으로 같이
  // 되돌아가게). caret은 새 블록에서 커서를 둘 자리예요.
  const insertBlockAfter = (
    id,
    type = "TEXT",
    { asChild = false, content, selfContent, caret = "end" } = {},
  ) => {
    const newId = nextId();
    pushUndoSnapshot();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      const ref = prev[index];
      // 요청: "블록 중첩/들여쓰기" — Enter로 이어지는 새 블록은 원래
      // 블록과 같은 들여쓰기 단(indent)에서 시작해요(노션도 들여쓴
      // 목록 안에서 Enter를 치면 새 항목이 같은 깊이에 생겨요).
      const indent = (ref?.indent || 0) + (asChild ? 1 : 0);
      // 요청: "같은 부모의 형제 블록은 색 통일" — 들여쓰기된 상태
      // (indent > 0)에서 Enter로 새 형제가 생기면, 지금 형제들과 같은
      // 배경색을 바로 이어받아야 해요 — 안 그러면 색칠된 블록 사이에
      // Enter로 새 줄을 추가할 때마다 색 없는 블록이 끼어들어서(정확히
      // 이번에 신고받은 "중간만 하얀색" 현상) 형제 통일이 깨져요.
      // 최상위(indent 0)는 형제끼리도 서로 독립적이라(부모가 없으니
      // "형제 그룹" 자체가 없어요) 여기선 물려받지 않아요.
      // 콜아웃/인용 안의 블록은 박스(컨테이너)가 배경을 칠하니까 자기 색을
      // 따로 물려받지 않아요. (asChild면 ref가 곧 부모라 그 색을 이어받아요.)
      const parentIsContainer = asChild
        ? isContainerBlock(ref)
        : isContainerBlock(prev[findParentIndex(prev, index)]);
      const inheritedColor =
        indent > 0 && ref && !parentIsContainer && blockCanHaveBackground(ref) ? ref.color || null : null;

      const insertAt = asChild ? index + 1 : getSubtreeRange(prev, index);
      const created = {
        ...createEmptyBlock(newId, type, onCreateChildPage),
        ...(indent ? { indent } : {}),
        ...(inheritedColor ? { color: inheritedColor } : {}),
        ...(content ? { content, richText: true } : {}),
      };
      next.splice(insertAt, 0, created);
      if (selfContent !== undefined) next[index] = { ...next[index], content: selfContent, richText: true };
      return next;
    });

    focusBlock(newId, caret);
    return newId;
  };

  // 블록 "위"에 같은 단의 빈 블록을 끼워 넣어요(블록 맨 앞에서 Enter를 칠 때: 글자는 그대로
  // 두고 위에 빈 줄만 생겨요). 커서는 원래 블록에 그대로 남아요.
  const insertEmptyBlockBefore = (id, type = "TEXT") => {
    const newId = nextId();
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const ref = prev[index];
      const next = [...prev];
      next.splice(index, 0, {
        ...createEmptyBlock(newId, type, onCreateChildPage),
        ...(ref.indent ? { indent: ref.indent } : {}),
      });
      return next;
    });
  };

  const addBlockAtEnd = (type = "TEXT") => {
    const newId = nextId();
    pushUndoSnapshot();
    setBlocks((prev) => [...prev, createEmptyBlock(newId, type, onCreateChildPage)]);
    focusBlock(newId);
  };

  // 블록이 소유한 하위 페이지가 있으면(getOwnedPageIds) 확인을 받고
  // DatabaseBlock.deleteRow와 같은 방식으로 onDeleteRowPage(=
  // MainLayout의 deletePage, 하위 페이지까지 재귀적으로 같이 지움)를
  // 호출해요. 소유한 페이지가 없으면 바로 proceed()를 실행하고, 있으면 확인창에서
  // "계속"을 눌렀을 때만 페이지를 지운 뒤 proceed()를 실행해요(취소하면 아무것도 안 해요). 블록 하나뿐 아니라
  // 배열(예: deleteBlock이 지우려는 블록 + 그 자식 전체)을 넘겨도 되게
  // 해서, 자식 중 하나라도 하위 페이지를 갖고 있으면 한 번에 같이
  // 확인·정리해요.
  const deleteOwnedPages = (blockOrBlocks, confirmMessage, proceed) => {
    const list = Array.isArray(blockOrBlocks) ? blockOrBlocks : [blockOrBlocks];
    const ownedPageIds = list.flatMap((b) => getOwnedPageIds(b));
    // 소유한 하위 페이지가 없으면 묻지 않고 바로 이어서 해요(키 입력 흐름이 그대로 이어져요).
    if (ownedPageIds.length === 0) {
      proceed();
      return;
    }

    // 있으면 앱 확인창으로 물어보고, "계속"을 누르면 페이지를 휴지통으로 보낸 뒤 이어서 해요.
    confirm({ title: "하위 페이지도 함께 이동해요", message: confirmMessage, confirmLabel: "계속", danger: true }).then((ok) => {
      if (!ok) return;
      ownedPageIds.forEach((pageId) => onDeleteRowPage?.(pageId));
      proceed();
    });
  };

  // 요청: "상위 블록을 이동하면 하위 블록도 같이 이동해... 배경색이나
  // font를 바꾸거나 하면 상위, 하위 블록 다 편집이 돼 복제도 마찬가지"
  // — 삭제도 같은 원칙이에요. 자식이 있는 블록을 지우는데 자식은 그대로
  // 남겨두면, 방금까지 "하위 블록"이었던 것들이 갑자기 부모 없이 위로
  // 붙어버려서 사용자가 기대한 "이 덩어리를 통째로 지운다"와 어긋나요
  // — 그래서 대상 블록 + 그 자식 전체(getSubtreeIds)를 한 번에 지워요.
  // keepChildren(빈 블록에서 Backspace): 노션처럼 이 블록만 지우고 자식은 남겨서 한 단 내어써요(자식 내용이
  // 확인도 없이 사라지지 않게). 핸들 메뉴의 "삭제"는 예전처럼 하위 블록까지 통째로 지워요.
  const deleteBlock = (id, { keepChildren = false } = {}) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const subtreeIds = keepChildren ? [id] : getSubtreeIds(blocks, index);
    const subtreeBlocks = blocks.filter((b) => subtreeIds.includes(b.id));
    const confirmMessage =
      subtreeIds.length > 1
        ? "이 블록과 하위 블록을 지우면 연결된 하위 페이지도 함께 휴지통으로 이동해요. 계속할까요?"
        : "이 블록을 지우면 연결된 하위 페이지도 함께 휴지통으로 이동해요. 계속할까요?";
    deleteOwnedPages(subtreeBlocks, confirmMessage, () => {

      pushUndoSnapshot();
      setBlocks((prev) => {
        const removeIndex = prev.findIndex((b) => b.id === id);
        if (removeIndex === -1) return prev;

        const removeIds = new Set(keepChildren ? [id] : getSubtreeIds(prev, removeIndex));
        const childIds = keepChildren ? new Set(getSubtreeIds(prev, removeIndex).filter((cid) => cid !== id)) : null;
        const next = prev
          .filter((b) => !removeIds.has(b.id))
          .map((b) => (childIds && childIds.has(b.id) ? { ...b, indent: Math.max(0, (b.indent || 0) - 1) } : b));

        // 에디터가 완전히 비면 안 돼요(bulkDeleteSelected의 빈 텍스트
        // 블록 대체와 같은 이유) — 자식까지 지우고 나니 블록이 하나도
        // 안 남았다면 빈 텍스트 블록 하나를 대신 남겨요.
        if (next.length === 0) {
          const fallback = createEmptyBlock(nextId(), "TEXT", onCreateChildPage);
          focusBlock(fallback.id);
          return [fallback];
        }

        // 커서는 바로 위의 "글자를 쓸 수 있는" 블록 끝으로 보내요. 바로 위가 이미지·구분선이거나 접힌 토글
        // 안에 숨은 블록이면 그 위의 쓸 수 있는 블록으로, 위에 없으면 아래쪽 첫 블록으로 가요.
        const hiddenNow = computeHiddenBlockIds(next);
        const canFocus = (b) => !hiddenNow.has(b.id) && (RICH_TEXT_TYPES.includes(b.type) || b.type === "CODE");
        let target = null;
        for (let i = Math.min(removeIndex, next.length) - 1; i >= 0 && !target; i -= 1) if (canFocus(next[i])) target = next[i];
        for (let i = removeIndex; i < next.length && !target; i += 1) if (canFocus(next[i])) target = next[i];
        if (target) focusBlock(target.id);

        return next;
      });
      setBlockMenu(null);
    });
  };

  // 요청: "모든 핸들버튼에 복제하기를 넣어서 누르면 똑같은게 바로 밑에
  // 생기게" — 단일 블록 핸들 메뉴용 복제예요. bulkDuplicateSelected와 같은
  // 방식(새 id를 받은 복사본을 원본 바로 뒤에 끼워 넣기)이지만 블록 하나만
  // 대상으로 해요.
  // 복제/붙여넣기로 만든 복사본이 원본과 같은 하위 페이지를 가리키면, 한쪽을 지울 때 다른 쪽 페이지까지
  // 휴지통으로 가요. 노션처럼 하위 페이지(와 그 아래 페이지들)도 새로 복제해서 복사본이 자기 페이지를 가리키게 해요.
  // onDuplicatePage가 없는 화면에서는 예전처럼 그대로 둬요. 상태 업데이트 함수 "밖"에서 불러야 해요(페이지가 두 번 생기지 않게).
  const clonePageLinks = (b) => {
    if (!onDuplicatePage) return b;
    let out = b;
    if (b.pageId != null) out = { ...out, pageId: onDuplicatePage(b.pageId)?.id ?? null };
    if (b.database?.rows?.some((r) => r.pageId != null)) {
      out = {
        ...out,
        database: {
          ...b.database,
          rows: b.database.rows.map((r) => (r.pageId != null ? { ...r, pageId: onDuplicatePage(r.pageId)?.id ?? null } : r)),
        },
      };
    }
    return out;
  };

  const duplicateBlock = (id) => {
    const srcIndex = blocks.findIndex((b) => b.id === id);
    if (srcIndex === -1) return;
    // 복사본(블록 + 자식 전체)을 먼저 만들어요 — 하위 페이지 복제가 섞여 있어서 업데이트 함수 안에서 하면 안 돼요.
    const subtreeCopy = blocks.slice(srcIndex, getSubtreeRange(blocks, srcIndex)).map((b) => clonePageLinks({ ...b, id: nextId() }));
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      // 요청: "블록 중첩/들여쓰기" — 자식이 있는 블록(바로 뒤로
      // indent가 더 큰 블록들이 이어지는 경우)을 복제할 땐 그 자식들도
      // 통째로 같이 복제해야 해요. 복사본 하나만 원본 바로 뒤(자식들
      // 앞)에 끼워 넣으면, 원래 자식들이 원본이 아니라 복사본의
      // 자식처럼 보이면서 중첩 구조가 깨져요 — 그래서 원본 + 자식
      // 전체 범위(getSubtreeRange)를 그대로 복사해서 그 범위가 끝나는
      // 지점(자식들 뒤)에 통째로 붙여요.
      const end = getSubtreeRange(prev, index);

      const next = [...prev];
      next.splice(end, 0, ...subtreeCopy);
      return next;
    });
    setBlockMenu(null);
  };

  // 요청: "상위 블록을 이동하면 하위 블록도 같이 이동해" — 핸들 메뉴의
  // ↑/↓도 마찬가지예요. 예전엔 바로 옆 블록 딱 하나와 자리만 바꿨는데,
  // 그러면 자식이 있는 블록을 위/아래로 옮길 때 자식들은 그 자리에 남고
  // 부모만 형제 사이로 쏙 빠져나가면서 중첩 구조가 깨져요. 그래서 이제
  // "이 블록 + 자식 전체"를 한 덩어리로 보고, "위"는 바로 앞의 형제
  // 블록(그리고 그 형제의 자식들까지) 전체와, "아래"는 바로 다음
  // 형제 블록(과 그 자식들) 전체와 통째로 자리를 바꿔요 — 형제인지
  // 아닌지는 indent가 이 블록과 똑같은지로 판단해요(자식은 항상 더
  // 깊고, 삼촌/조부모 블록은 항상 더 얕아요).
  const moveBlock = (id, direction) => {
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const baseIndent = prev[index].indent || 0;
      const end = getSubtreeRange(prev, index); // 이 블록 + 자식들의 끝(배타적)

      if (direction === "up") {
        // 바로 앞 블록부터 거슬러 올라가며 "이 블록과 같은 단(indent)"인
        // 형제를 찾아요 — 그 사이(더 깊은 indent)는 전부 그 형제의
        // 자식이라 같이 딸려가요.
        let start = index - 1;
        while (start > 0 && (prev[start].indent || 0) > baseIndent) start -= 1;
        if (start < 0 || (prev[start].indent || 0) !== baseIndent) return prev;

        return [
          ...prev.slice(0, start),
          ...prev.slice(index, end),
          ...prev.slice(start, index),
          ...prev.slice(end),
        ];
      }

      // direction === "down": 바로 다음 블록이 같은 단의 형제가
      // 아니면(더 얕은 삼촌 블록이거나 배열 끝) 더 내려갈 형제가 없는
      // 거라 아무 동작도 안 해요.
      if (end >= prev.length || (prev[end].indent || 0) !== baseIndent) return prev;
      const nextEnd = getSubtreeRange(prev, end);

      return [
        ...prev.slice(0, index),
        ...prev.slice(end, nextEnd),
        ...prev.slice(index, end),
        ...prev.slice(nextEnd),
      ];
    });
    setBlockMenu(null);
  };

  // 요청: "블록 중첩/들여쓰기" — Tab/Shift+Tab으로 블록을 한 단
  // 들여쓰기/내어쓰기 해요. 트리 구조로 새로 짜는 대신(드래그·다중
  // 선택·복제 등 기존 로직을 blocks가 평평한 배열이라는 전제로 그대로
  // 쓸 수 있게) block.indent(0,1,2…) 숫자 하나로 "몇 단 들여쓰기됐는지"
  // 만 저장하고, 화면에는 그 값만큼 왼쪽 여백을 줘서 중첩처럼 보이게
  // 해요(BlockRow의 marginLeft 계산 참고) — 부모-자식 관계는 "바로
  // 앞에 있는, indent가 더 작은 블록"으로 암묵적으로 정해져요.
  //
  // 들여쓰기 가능 조건(노션과 동일): 바로 앞 블록의 indent가 지금
  // indent 이상이어야 해요 — 그래야 그 앞 블록(또는 그 앞 블록이 속한
  // 목록의 마지막 항목)이 새 부모가 될 수 있어요. 맨 앞 블록이거나
  // 바로 앞 블록이 더 얕으면(형제가 없으면) 들여쓸 게 없어서 아무
  // 동작도 안 해요.
  //
  // 이 블록에 이미 자식이 있으면(바로 뒤로 indent가 더 큰 블록들이
  // 이어지면) 그 자식들도 같이 한 단 들여쓰기/내어쓰기해야 상대적인
  // 중첩 구조가 유지돼요 — getSubtreeRange가 그 범위(자기 자신 포함,
  // 끝 인덱스는 배타적)를 찾아줘요.
  const indentBlock = (id) => {
    const restoreCaret = keepCaret(id);
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index <= 0) return prev;

      const baseIndent = prev[index].indent || 0;
      const parentIndex = index - 1;
      if ((prev[parentIndex].indent || 0) < baseIndent) return prev;

      const end = getSubtreeRange(prev, index);
      const indentedRaw = prev.map((b, i) => {
        if (i < index || i >= end) return b;
        return { ...b, indent: (b.indent || 0) + 1 };
      });

      // 요청: "블록 종류가 노션보다 적어요"(토글) — 방금 어떤 블록의 새
      // 부모가 된 블록이 "접힌" 토글이면, 이 블록이 그 순간 바로 숨겨진
      // 자식이 돼버려서 방금 Tab을 친 사용자 눈앞에서 사라져요. 노션도
      // 접힌 토글에 새 자식이 생기면 자동으로 펼쳐줘서 이 문제가 없어요
      // — 같은 방식으로, 새 부모가 접힌 토글이면 펼쳐요.
      const newParentIndexForToggle = findParentIndex(indentedRaw, index);
      const indented =
        newParentIndexForToggle !== -1 &&
        indentedRaw[newParentIndexForToggle]?.type === "TOGGLE" &&
        indentedRaw[newParentIndexForToggle].collapsed
          ? indentedRaw.map((b, i) => (i === newParentIndexForToggle ? { ...b, collapsed: false } : b))
          : indentedRaw;

      // 요청: "덩어리 아래 블록에서 tab을 하여 덩어리가 되면 배경색이
      // 생기게" + "같은 부모의 형제 블록은 색 통일" — 들여쓰기로 어떤
      // 색칠된 그룹의 새 형제가 되면, 옮겨진 덩어리(이 블록 + 그
      // 자식들) 전체가 그 그룹의 색을 물려받아요. 단순히 바로 앞
      // 블록의 색만 베끼면(예전 방식) 그 앞 블록이 실은 삼촌/조부모뻘일
      // 때 엉뚱한 색을 물려받을 수 있어서, findParentIndex로 진짜
      // 구조상 부모를 찾고 그 부모의 직계 자식 그룹 전체를 한 색으로
      // 맞춰요(resolveGroupColor) — 새 부모/형제 그룹에 색이 전혀
      // 없으면 지금 색은 그대로 둬요(들여쓰기가 색을 지우진 않아요 —
      // 아래 outdentBlock의 "탈출하면 지워짐"과는 방향이 다른 동작).
      const newParentIndex = findParentIndex(indented, index);
      if (newParentIndex === -1) return indented;
      // 콜아웃/인용 안으로 들어가는 경우엔 박스가 색을 맡으니 형제 색 통일을
      // 건너뛰어요(들어온 블록은 자기 색을 그대로 유지).
      if (isContainerBlock(indented[newParentIndex])) return indented;
      const siblingIndices = getDirectChildrenIndices(indented, newParentIndex);
      const targetColor = resolveGroupColor(indented, newParentIndex, siblingIndices);
      if (!targetColor) return indented;

      const groupIds = new Set();
      siblingIndices.forEach((i) => getSubtreeIds(indented, i).forEach((bid) => groupIds.add(bid)));
      return indented.map((b) =>
        groupIds.has(b.id) && blockCanHaveBackground(b) ? { ...b, color: targetColor } : b,
      );
    });
    restoreCaret();
  };

  const outdentBlock = (id) => {
    const restoreCaret = keepCaret(id);
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const baseIndent = prev[index].indent || 0;
      if (baseIndent === 0) return prev;

      // 요청: "덩어리에서 탈출(shift+tab)을 하면 배경색이 사라져야" —
      // 지금 부모(바로 위 단, indent가 하나 작은 가장 가까운 앞 블록 —
      // 앞의 형제들과 그 자식들을 다 건너뛰고 찾아요)가 색이 있고, 이
      // 블록의 색이 그 부모와 똑같으면(=부모한테서 물려받은 색으로
      // 봐요) 내어쓰기와 함께 색을 지워요. 부모와 다른 색을 따로 갖고
      // 있었다면 일부러 고른 색일 수 있으니 그대로 둬요.
      let oldParentIndex = index - 1;
      while (oldParentIndex > 0 && (prev[oldParentIndex].indent || 0) >= baseIndent) oldParentIndex -= 1;
      const oldParent = prev[oldParentIndex];
      const oldParentColor =
        oldParent && (oldParent.indent || 0) === baseIndent - 1 ? oldParent.color || null : null;
      const wasInherited = !!(
        oldParentColor &&
        !isContainerBlock(oldParent) &&
        prev[index].color === oldParentColor
      );

      const end = getSubtreeRange(prev, index);
      const outdented = prev.map((b, i) => {
        if (i === index) {
          const nextIndent = (b.indent || 0) - 1;
          return { ...b, indent: nextIndent, color: wasInherited ? null : b.color };
        }
        if (i > index && i < end) {
          return { ...b, indent: (b.indent || 0) - 1 };
        }
        return b;
      });

      // 요청: "3, 4, 5가 덩어리니까 4, 5도 하얀 배경이어야지" — 방금
      // 내어쓴 이 블록(index) 자신의 색이 이번 조작으로 바뀌었다면(위에서
      // 물려받은 색을 잃었거나, 자기 색을 그대로 지켰거나), 그 아래
      // 자식들(index의 부모는 여전히 index 자신이니까)도 항상 그 색과
      // 같아야 해요 — "부모 색이 바뀌면 자식도 같이 바뀐다"는 맨 처음
      // 원칙을, 색상 피커로 직접 바꿀 때뿐 아니라 Tab/Shift+Tab처럼
      // "자동으로" 색이 바뀌는 경우에도 항상 같은 방식(getSubtreeIds로
      // 전체 하위 트리 재계산)으로 적용해서 특정 상황만 따로 처리하는
      // 하드코딩 없이 항상 일관되게 맞아떨어지게 해요.
      //
      // 요청: "같은 부모의 형제 블록은 색 통일" — 새로 도착한 자리(한
      // 단 얕은 곳)에 이미 형제가 있다면(findParentIndex/
      // getDirectChildrenIndices), 부모 자신의 색이나 그 형제들 중 이미
      // 칠해진 색을 최우선으로 따라가고(resolveGroupColor), 최상위로
      // 나왔다면(newParentIndex === -1) 형제 그룹이라는 게 없으니 이
      // 블록 자신의(방금 정해진) 색만 기준으로 삼아요.
      const newParentIndex = findParentIndex(outdented, index);
      // 콜아웃/인용 안에 그대로 남는 경우(더 깊은 곳에서 한 단 나온 경우)엔
      // 박스가 색을 맡으니 이 블록 덩어리만 자기 색 기준으로 정리해요.
      const newParentIsContainer = newParentIndex !== -1 && isContainerBlock(outdented[newParentIndex]);
      const siblingIndices =
        newParentIndex === -1 || newParentIsContainer
          ? [index]
          : getDirectChildrenIndices(outdented, newParentIndex);
      const targetColor = resolveGroupColor(
        outdented,
        newParentIsContainer ? -1 : newParentIndex,
        siblingIndices,
      );

      const groupIds = new Set();
      siblingIndices.forEach((i) => getSubtreeIds(outdented, i).forEach((bid) => groupIds.add(bid)));
      return outdented.map((b) =>
        groupIds.has(b.id) && blockCanHaveBackground(b) ? { ...b, color: targetColor } : b,
      );
    });
    restoreCaret();
  };

  // 요청: "밑에 덩어리를 위에 덩어리 위로 올리면 한 덩어리가 돼 —
  // 덩어리 위에 올릴 경우엔 합쳐지면 안 되고, 덩어리 아래로 옮기는
  // 경우엔 합류할지 말지 선택할 수 있어야 해" — 노션 참고: 노션은 드롭
  // 위치를 정할 때 세로 위치(이 블록 위/아래)뿐 아니라 가로(커서가 얼마나
  // 들여써진 자리에 있는지)도 같이 봐서 "그 블록의 형제로 놓을지, 자식으로
  // 합류할지"를 정해요. 여기도 같은 방식으로 확장했어요.
  //
  //  - 어떤 블록 "위"(윗쪽 2/3 안)에 놓으면: 항상 그 블록과 같은
  //    단(형제)이에요. 자식이 되는 경우가 아예 없어서, 절대 그 블록
  //    안으로 "합쳐지지" 않아요.
  //  - 어떤 블록 "아래"(아래쪽 1/3)에 놓으면: 커서의 가로 위치로 선택해요.
  //    - 커서가 오른쪽(한 단 더 들여쓴 자리)에 있으면 → 그 블록의 새
  //      첫 자식으로 합류해요.
  //    - 커서가 왼쪽(그 블록과 같은 단)에 있으면 → 그 블록의 기존
  //      자식들까지 전부 지나서, "그 블록 + 자식 전체" 덩어리의 형제로
  //      (합류 안 하고) 바로 아래에 놓여요.
  //
  // wantsNested는 BlockRow의 onDragOver(아래, 가로 위치로 계산)가
  // 넘겨줘요. beforeBlockId 하나만으론 "어느 깊이로 들어갈지"를 표현할
  // 수 없어서, blockDropTarget에 indent(목표 들여쓰기 단)도 같이
  // 담아요 — commitBlockDrop이 실제로 옮길 때 이 값대로 맞춰요.
  const handleBlockDragOver = (hoveredBlockId, isAfter, wantsNested = false) => {
    // 호버 중인 블록이 지금 같이 드래그 중인 그룹 안에 있으면(자기 자신이거나,
    // 같이 딸려가는 다른 선택 블록이거나) 의미 없는 목표라 걸러요.
    if (dragBlockId === null || draggedGroupIds.has(hoveredBlockId)) return;

    const hoveredIndex = blocks.findIndex((b) => b.id === hoveredBlockId);
    if (hoveredIndex === -1) return;
    const hoveredIndent = blocks[hoveredIndex].indent || 0;

    let beforeBlockId;
    let indent;

    if (!isAfter) {
      indent = hoveredIndent;
      beforeBlockId = hoveredBlockId;
    } else if (wantsNested) {
      indent = hoveredIndent + 1;
      const nextBlock = blocks[hoveredIndex + 1] ?? null;
      beforeBlockId = nextBlock ? nextBlock.id : null;
    } else {
      indent = hoveredIndent;
      const afterSubtree = blocks[getSubtreeRange(blocks, hoveredIndex)] ?? null;
      beforeBlockId = afterSubtree ? afterSubtree.id : null;
    }

    if (beforeBlockId !== null && draggedGroupIds.has(beforeBlockId)) {
      setBlockDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 실제로 순서·깊이가 안 바뀌는 자리(지금 있는 자리 그대로)면 줄을
    // 숨겨요 — 그룹 드래그(비연속일 수 있음)에서는 "제자리"가 잘
    // 정의되지 않아서 단일 블록(자식 없이 혼자)을 옮길 때만 이
    // 최적화를 적용해요.
    if (draggedGroupIds.size === 1) {
      const fromIndex = blocks.findIndex((b) => b.id === dragBlockId);
      const fromIndent = blocks[fromIndex]?.indent || 0;
      const samePlace =
        beforeBlockId === null
          ? fromIndex === blocks.length - 1
          : blocks.findIndex((b) => b.id === beforeBlockId) === fromIndex + 1;
      if (samePlace && indent === fromIndent) {
        setBlockDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setBlockDropTarget((prev) =>
      prev && prev.beforeBlockId === beforeBlockId && prev.indent === indent
        ? prev
        : { beforeBlockId, indent },
    );
  };

  // 맨 마지막 블록 아래의 빈 공간(block-editor__empty-area, 원래도 있던
  // "클릭하면 이어 쓰기" 영역)에 들어오면 "맨 끝으로" 처리해요. 블록
  // 사이에는 칸반과 달리 gap이 없어서(.block-editor에 gap 없음) 별도의
  // 전용 end-zone을 새로 만들 필요 없이 이 기존 빈 영역을 그대로 써요.
  // 페이지 맨 끝은 항상 최상위(indent 0)예요 — 어떤 블록의 자식으로
  // 합류할 대상 자체가 없으니까요.
  const handleEditorEndDragEnter = () => {
    if (dragBlockId === null) return;

    if (draggedGroupIds.size === 1) {
      const fromIndex = blocks.findIndex((b) => b.id === dragBlockId);
      if (fromIndex === blocks.length - 1 && (blocks[fromIndex]?.indent || 0) === 0) {
        setBlockDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setBlockDropTarget((prev) =>
      prev && prev.beforeBlockId === null && prev.indent === 0 ? prev : { beforeBlockId: null, indent: 0 },
    );
  };

  // 실제 배열 반영은 여기서 딱 한 번(드롭할 때). 그룹(draggedGroupIds) 전체를
  // 원래 상대 순서를 유지한 채로 한 덩어리로 뽑아냈다가, 목표 위치에 통째로
  // 다시 끼워 넣어요 — 단일 블록 드래그도 draggedGroupIds가 항상 원소 1개인
  // 집합이라 같은 코드 경로를 타요.
  const commitBlockDrop = () => {
    if (dragBlockId !== null && blockDropTarget && draggedGroupIds.size > 0) {
      pushUndoSnapshot();
      setBlocks((prev) => {
        const movingRaw = prev.filter((b) => draggedGroupIds.has(b.id));
        if (movingRaw.length === 0) return prev;

        // 요청: "덩어리 위/아래로 옮길 때 합류할지 말지 선택할 수 있게" —
        // handleBlockDragOver가 커서 위치로 이미 정해둔 목표 들여쓰기 단
        // (blockDropTarget.indent)에 맞춰, 옮기는 덩어리 전체를 한 번에
        // 밀거나 당겨요. 덩어리의 맨 앞(루트) 블록이 그 목표 단이 되도록
        // 델타를 구해서 덩어리 안의 모든 블록(루트+자식)에 똑같이
        // 적용하면, 덩어리 내부의 상대적인 부모/자식 관계는 그대로 유지된
        // 채 덩어리 전체만 깊이가 옮겨져요.
        const targetIndent = blockDropTarget.indent ?? (movingRaw[0].indent || 0);
        const delta = targetIndent - (movingRaw[0].indent || 0);
        const moving =
          delta === 0
            ? movingRaw
            : movingRaw.map((b) => ({ ...b, indent: Math.max(0, (b.indent || 0) + delta) }));

        const rest = prev.filter((b) => !draggedGroupIds.has(b.id));

        if (blockDropTarget.beforeBlockId === null) {
          return [...rest, ...moving];
        }

        const toIndex = rest.findIndex((b) => b.id === blockDropTarget.beforeBlockId);
        if (toIndex === -1) {
          return [...rest, ...moving];
        }

        const next = [...rest];
        next.splice(toIndex, 0, ...moving);
        return next;
      });
    }

    setDragBlockId(null);
    setDraggedGroupIds(new Set());
    setBlockDropTarget(null);
  };

  // 문장 중간 슬래시("hello /todo")로 고른 블록은 현재 블록의 "/명령" 글자만 지우고 바로 아래에 만들어요.
  const stripTrailingSlashQuery = (html, query) => {
    // 화면과 분리된 <template>에서 파싱해요(걸러내기 전에 이미지 onerror 같은 게 실행되지 않게).
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    const box = tpl.content;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) last = n;
    if (last) {
      const token = `/${query}`;
      const data = last.data.replace(/\u00a0/g, " ");
      if (data.endsWith(token)) {
        last.data = last.data.slice(0, last.data.length - token.length).replace(/[ \u00a0]+$/, "");
      }
    }
    const out = document.createElement("div");
    out.appendChild(box);
    return sanitizeInlineHtml(out.innerHTML);
  };

  const convertBlock = (id, type) => {
    if (slashMenu?.blockId === id && slashMenu.mid) {
      const cur = blocks.find((b) => b.id === id);
      const stripped = stripTrailingSlashQuery(cur?.content, slashMenu.query);
      setSlashMenu(null);
      updateBlock(id, { content: stripped, richText: true });
      const nid = insertBlockAfter(id, type === "CHILD_PAGE" ? "TEXT" : type);
      if (type === "CHILD_PAGE") convertBlock(nid, "CHILD_PAGE");
      return;
    }

    // 슬래시 메뉴로 바꾸는 경우엔 "/"를 처음 칠 때 이미 그 이전 상태를 저장해
    // 뒀어요(handleChange) — 또 쌓으면 "/h1" 같은 중간 상태로 한 번 더 되돌아가요.
    if (slashMenu?.blockId !== id) pushUndoSnapshot();
    // 타입을 바꾸면 이 블록이 지금 갖고 있던 pageId/database.rows의
    // 페이지 연결은 항상 버려져요(아래 각 분기가 pageId: null이나
    // 새 database로 덮어씀) — 그대로 두면 deleteBlock과 똑같이 고아
    // 페이지가 생겨서, 같은 확인+cascade delete를 여기서도 해요.
    const current = blocks.find((b) => b.id === id);
    const confirmMessage = "타입을 바꾸면 이 블록에 연결된 하위 페이지도 함께 휴지통으로 이동해요. 계속할까요?";

    if (type === "CHILD_PAGE") {
      // 새 하위 페이지를 바로 만들고, 이 블록을 그 페이지로 가는
      // 링크로 바꿔요. (현재 페이지에는 그대로 머무름 — 슬래시 명령
      // 중에 갑자기 다른 페이지로 튕기면 어색하니까) 저장되는 type은
      // 여전히 'TEXT'예요 — pageId가 있으면 렌더링만 링크로 바뀌어요.
      // newPage부터 만들어서 실패(onCreateChildPage 미전달 등) 시엔
      // 기존 페이지를 지우기 전에 그냥 빠져나가게 해요.
      const newPage = onCreateChildPage?.();
      if (!newPage) return;
      deleteOwnedPages(current, confirmMessage, () => {
        updateBlock(id, { type: "TEXT", content: "", pageId: newPage.id });
        setSlashMenu(null);
        setBlockMenu(null);
      });
      return;
    }

    if (type === "TABLE") {
      // "표"도 CHILD_PAGE와 같은 패턴이에요 — DDL엔 TABLE이라는 blocks.type이
      // 없어서, 실제로 저장되는 type은 여전히 'DATABASE'고 database.kind로만
      // "표"(단순 텍스트 그리드)인지 "데이터베이스"(속성 타입)인지 갈라요.
      deleteOwnedPages(current, confirmMessage, () => {
        updateBlock(id, { type: "DATABASE", content: "", pageId: null, database: createSimpleTable() });
        setSlashMenu(null);
        setBlockMenu(null);
      });
      return;
    }

    deleteOwnedPages(current, confirmMessage, () => {

      // 핸들 메뉴/툴바의 "타입 변경"은 노션의 "Turn into"처럼 글자를 그대로 가져가요. 슬래시 메뉴로 바꿀 때는
      // 블록 내용이 "/명령" 글자라서 비워요. 글자 없는 블록(이미지·표 등)으로 바뀌는 경우도 비워요.
      const fromSlash = slashMenu?.blockId === id;
      const textLike = (t) => RICH_TEXT_TYPES.includes(t) || t === "CODE";
      let keptContent = "";
      if (!fromSlash && current && !current.pageId && textLike(current.type) && textLike(type)) {
        const raw = current.content || "";
        if (current.type === "CODE" && type !== "CODE") keptContent = escapePlainTextToHtml(raw).replace(/\n/g, "<br>");
        else if (current.type !== "CODE" && type === "CODE") keptContent = stripHtml(raw.replace(/<br\s*\/?>/gi, "\n"));
        else keptContent = raw;
      }
      updateBlock(id, {
        type,
        content: keptContent,
        ...(keptContent && type !== "CODE" ? { richText: true } : {}),
        pageId: null, // 이전에 하위 페이지 링크였을 수도 있으니 항상 초기화
        ...(type === "TODO" ? { checked: false } : {}),
        ...(type === "IMAGE" || type === "FILE" ? { image: null } : {}),
        ...(type === "DATABASE" ? { database: createDefaultDatabase(onCreateChildPage) } : {}),
        ...(type === "TASK" ? { taskId: null } : {}),
        ...(type === "EVENT" ? { eventId: null } : {}),
        ...(type === "SPRINT" ? { sprintId: null } : {}),
        ...(type === "TOGGLE" ? { collapsed: false } : {}),
        // 요청: "블록 종류가 노션보다 적어요"(콜아웃) — 다른 타입에서
        // 콜아웃으로 바꿀 때도 createEmptyBlock과 똑같이 기본 아이콘·
        // 회색 배경으로 시작해요(이미 콜아웃이었다가 다른 타입을 거쳐
        // 다시 콜아웃으로 돌아온 경우엔 원래 쓰던 아이콘/색을 그대로
        // 살려요).
        ...(type === "CALLOUT" ? { calloutIcon: current?.calloutIcon || "💡", color: current?.color || "gray" } : {}),
      });
      setSlashMenu(null);
      setBlockMenu(null);
      focusBlock(id);
    });
  };

  // 이미지 ↔ 파일 전환 — 요청: 이미지 블록은 "타입 변경" 대신 "파일로
  // 변경"이, 파일 블록은 반대로 "이미지로 변경"이 핸들 메뉴에 바로
  // 떠서 한 번에 서로 바뀌어야 해요. 같은 첨부(같은 url/파일명/용량,
  // block.image)를 "크게 미리보기로 보여줄지 파일 한 줄로 보여줄지"만
  // 바꾸는 토글이라, content/image를 초기화하는 convertBlock과 달리
  // type 필드만 바꿔서 데이터(사진/파일 자체)는 그대로 남아있어요.
  const swapImageFileType = (id, type) => {
    updateBlock(id, { type });
    setBlockMenu(null);
  };

  // 요청: 핸들 메뉴에서 블록 배경색을 고를 수 있어야 해요(노션의 블록
  // 색상 메뉴와 같은 자리). color는 null이면 "기본"(배경 없음)이고,
  // 있으면 BLOCK_COLORS의 key 중 하나예요 — 실제 색상값은 렌더링할 때
  // BLOCK_COLORS에서 찾아 .block-row에 인라인으로 칠해요.
  //
  // 요청: "배경색이나 font를 바꾸거나 하면 상위, 하위 블록 다 편집이
  // 돼" — 자식이 있는 블록의 색을 바꾸면 그 자식들도 같이 바뀌어야
  // 해요(bulkSetColor와 완전히 같은 이유·같은 필터: 블록마다 색을 쓸
  // 수 있는지가 달라서 blockCanHaveBackground로 걸러요).
  //
  // 요청: "같은 부모의 형제 블록은 색 통일" — 자식뿐 아니라 이 블록과
  // 같은 부모 밑에 나란히 있는 형제들도 다 같이 바뀌어야, "형제 중
  // 하나만 색이 다른" 상태(이번에 신고받은 "중간만 하얀색")가 아예 생길
  // 수가 없어요. 최상위(indent 0) 블록은 형제 그룹이 없으니(부모가
  // 없음) 예전처럼 자기 자신 + 자식들만 바뀌어요.
  const setBlockColor = (id, color) => {
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const ids = collectColorTargetIds(prev, index);
      return prev.map((b) => (ids.has(b.id) && blockCanHaveBackground(b) ? { ...b, color } : b));
    });
    setBlockMenu(null);
  };

  // 요청: 배경색 말고 글자색도 핸들 메뉴에서 고를 수 있어야 해요.
  // textColor는 block.color와 완전히 독립된 필드라 배경색·글자색을
  // 동시에 따로 지정할 수 있어요. 배경색과 같은 이유로 자식들도 같이
  // 바뀌고(blockCanHaveTextColor로 걸러서), "같은 부모의 형제 블록은
  // 색 통일" 요청에 맞춰 형제들도 같이 바뀌어요(setBlockColor와 동일).
  const setBlockTextColor = (id, textColor) => {
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const ids = collectColorTargetIds(prev, index);
      return prev.map((b) => (ids.has(b.id) && blockCanHaveTextColor(b) ? { ...b, textColor } : b));
    });
    setBlockMenu(null);
  };

  // 요청: "여러 블록 선택하고 핸들 버튼 이용이 가능하게" — 드래그로 여러
  // 블록을 선택한 상태(selectedBlockIds.size > 1)에서 그 중 아무
  // 블록이나 핸들(⋯)을 눌러도 그 블록 하나만의 메뉴가 아니라, 선택된
  // 블록 전체에 적용되는 일괄 메뉴(bulkMenu)가 떠요. 배경색·글자색은
  // 개별 메뉴와 같은 팔레트(BLOCK_COLORS/BLOCK_TEXT_COLORS)를 쓰되,
  // 블록마다 적용 가능 여부가 달라서(표는 되고 보드형 데이터베이스는
  // 안 되고 등, 위 blockCanHaveBackground/blockCanHaveTextColor 참고)
  // 선택된 블록 중 그 색을 실제로 쓸 수 있는 것만 걸러서 적용해요.
  const bulkSetColor = (color) => {
    pushUndoSnapshot();
    setBlocks((prev) =>
      prev.map((b) => (selectedBlockIds.has(b.id) && blockCanHaveBackground(b) ? { ...b, color } : b)),
    );
    setBulkMenu(null);
  };

  const bulkSetTextColor = (textColor) => {
    setBlocks((prev) =>
      prev.map((b) => (selectedBlockIds.has(b.id) && blockCanHaveTextColor(b) ? { ...b, textColor } : b)),
    );
    setBulkMenu(null);
  };

  // deleteBlock(단일 삭제)과 같은 이유로, 지우려는 블록 중 하위 페이지를
  // 소유한 게 있으면(하위 페이지 블록, 데이터베이스 행 등) 한 번만
  // 확인받아요 — 블록마다 따로 confirm 창을 띄우면 여러 개 지울 때
  // 너무 성가셔요. 다 지워서 블록이 하나도 안 남으면(에디터가 완전히
  // 비면 안 돼요, deleteBlock의 prev.length === 1 가드와 같은 이유) 빈
  // 텍스트 블록 하나를 대신 남겨요.
  const bulkDeleteSelected = () => {
    const doomedIds = expandSelectionWithSubtrees(blocks, selectedBlockIds);
    const targets = blocks.filter((b) => doomedIds.has(b.id));
    if (targets.length === 0) return;

    deleteOwnedPages(targets, "선택한 블록을 지우면 연결된 하위 페이지도 함께 휴지통으로 이동해요. 계속할까요?", () => {
      pushUndoSnapshot();
      setBlocks((prev) => {
        const next = prev.filter((b) => !doomedIds.has(b.id));
        return next.length > 0 ? next : [createEmptyBlock(nextId(), "TEXT", onCreateChildPage)];
      });

      setSelectedBlockIds(new Set());
      selectionAnchorIdRef.current = null;
      setBulkMenu(null);
    });
  };

  // 요청: 노션 도움말을 보니 cmd/ctrl+D로 선택된 블록을 복제할 수 있고,
  // 핸들 메뉴에서도 같은 동작을 할 수 있어요. 한계: 하위 페이지를
  // 가리키는 블록(TEXT+pageId, 데이터베이스 행)을 복제하면 노션은 그
  // 하위 페이지까지 통째로 복제하지만, 여기선 페이지 자체를 복제하는
  // 기능이 없어서 복사본도 같은 페이지를 그대로 가리켜요.
  //
  // 버그 수정(요청: "44 22를 복제했는데 44 44 22 22가 돼, 44 22 44 22가
  // 돼야지") — 원래는 각 원본 바로 뒤에 자기 복사본을 하나씩 끼워
  // 넣었어요(44 뒤에 44', 22 뒤에 22') 그래서 44 44' 22 22'처럼
  // 번갈아 섞였어요. 노션은 선택 전체를 하나의 묶음으로 보고 그
  // 묶음의 복사본을 원본 묶음 바로 뒤에 통째로 붙이니까, 여기서도
  // 선택된 블록들을 원래 순서 그대로 복사한 다음 "선택된 블록 중
  // 배열에서 가장 뒤에 있는 것" 바로 뒤에 한 덩어리로 끼워 넣어요
  // (44 22 뒤에 44' 22' → 44 22 44' 22').
  const bulkDuplicateSelected = () => {
    if (selectedBlockIds.size === 0) return;

    const withKids = expandSelectionWithSubtrees(blocks, selectedBlockIds);
    const newIds = [];
    const duplicates = blocks
      .filter((b) => withKids.has(b.id))
      .map((b) => {
        const newId = nextId();
        newIds.push(newId);
        return clonePageLinks({ ...b, id: newId });
      });
    if (duplicates.length === 0) return;

    let lastSelectedIndex = -1;
    blocks.forEach((b, i) => {
      if (withKids.has(b.id)) lastSelectedIndex = i;
    });

    // 요청: "블록 중첩/들여쓰기" — 선택된 마지막 블록에 (선택되지 않은)
    // 자식이 딸려 있으면, 복사본 묶음을 그 자식들 사이(=마지막 선택
    // 블록 바로 뒤)가 아니라 자식들까지 다 지나간 뒤에 끼워 넣어야
    // 해요 — 안 그러면 원래 자식들이 복사본의 자식처럼 보이면서
    // 중첩 구조가 깨져요.
    const insertAt = getSubtreeRange(blocks, lastSelectedIndex);

    pushUndoSnapshot();
    const next = [...blocks];
    next.splice(insertAt, 0, ...duplicates);
    setBlocks(next);
    // 노션도 복제하면 복사본이 선택돼요 — 방금 만든 것들로 선택을 옮겨요.
    setSelectedBlockIds(new Set(newIds));
    selectionAnchorIdRef.current = newIds[newIds.length - 1] ?? null;
    setBulkMenu(null);
  };

  // 요청: cmd/ctrl+shift+화살표로 선택된 블록(들)을 위/아래로 한 칸씩
  // 옮겨요. 선택이 떨어져 있어도(예: cmd+shift+클릭으로 군데군데 고른
  // 경우) 그룹 전체를 한 덩어리로 묶어서 옮기는 표준 방식이에요 — "위로"는
  // 배열을 위에서 아래로 훑으면서 선택된 블록 바로 앞이 선택 안 된
  // 블록이면 서로 자리를 바꾸고, "아래로"는 반대 방향(아래에서 위로)으로
  // 똑같이 해요. 한 번 호출에 정확히 한 칸만 옮겨서, 계속 누르면
  // 반복적으로 더 옮겨갈 수 있어요.
  // 선택(+ 각자의 자식 전체)을 "연속된 덩어리(run)"로 묶어서, 덩어리째 바로 옆 형제 덩어리와
  // 자리를 바꿔요(moveBlock과 같은 규칙). 블록 하나씩 밀면 부모와 자식 순서가 뒤집혀서
  // 구조가 깨지기 때문이에요.
  const bulkMoveSelected = (direction) => {
    if (selectedBlockIds.size === 0) return;
    pushUndoSnapshot();
    setBlocks((prev) => {
      const ids = expandSelectionWithSubtrees(prev, selectedBlockIds);
      // 연속된 선택 구간의 [첫 id, 마지막 id] 목록
      const runs = [];
      let runStart = null;
      prev.forEach((b, i) => {
        if (ids.has(b.id)) {
          if (runStart === null) runStart = i;
          if (i === prev.length - 1 || !ids.has(prev[i + 1].id)) {
            runs.push([prev[runStart].id, b.id]);
            runStart = null;
          }
        }
      });

      let arr = [...prev];
      const ordered = direction === "up" ? runs : [...runs].reverse();
      ordered.forEach(([firstId, lastId]) => {
        const start = arr.findIndex((b) => b.id === firstId);
        const end = arr.findIndex((b) => b.id === lastId) + 1;
        const baseIndent = arr[start].indent || 0;
        if (direction === "up") {
          let sib = start - 1;
          while (sib > 0 && (arr[sib].indent || 0) > baseIndent) sib -= 1;
          if (sib < 0 || (arr[sib].indent || 0) !== baseIndent) return;
          arr = [...arr.slice(0, sib), ...arr.slice(start, end), ...arr.slice(sib, start), ...arr.slice(end)];
        } else {
          if (end >= arr.length || (arr[end].indent || 0) !== baseIndent) return;
          const nextEnd = getSubtreeRange(arr, end);
          arr = [...arr.slice(0, start), ...arr.slice(end, nextEnd), ...arr.slice(start, end), ...arr.slice(nextEnd)];
        }
      });
      return arr;
    });
  };

  // 요청: 노션은 여러 블록을 선택해도 "타입 변경"(turn into)을 할 수
  // 있어요. 이미 있는 단일 블록용 convertBlock을 선택된 블록마다 그대로
  // 돌려요 — CHILD_PAGE로 바꾸는 경우 선택된 블록 수만큼 새 하위 페이지가
  // 하나씩 생기고, 하위 페이지를 갖고 있던 블록을 다른 타입으로 바꾸는
  // 경우엔 convertBlock 안의 확인 창이 블록마다 한 번씩 뜰 수 있어요(흔치
  // 않은 조합이라 일괄 확인까지는 만들지 않았어요).
  const bulkConvert = (type) => {
    Array.from(selectedBlockIds).forEach((id) => convertBlock(id, type));
    setBulkMenu(null);
  };

  // 노션처럼 "블록 추가" 버튼을 따로 안 두고, 본문 아래 빈 공간을 클릭하면
  // 이어서 쓸 수 있는 빈 블록이 생겨요. 마지막 블록이 "아직 아무것도 안
  // 쓴" 빈 텍스트 블록이면 새로 만들지 않고 그 블록으로 포커스만 이동해요
  // (빈 블록이 계속 쌓이지 않게). 하위 페이지 링크도 저장상 type이
  // 'TEXT'에 content가 ""라 겉보기엔 "빈 블록"과 똑같지만, 실제로는 글을
  // 쓸 수 있는 칸이 아니라 클릭하면 이동하는 링크라서 여기서 focusBlock을
  // 해봐야 아무 반응이 없었어요 — pageId가 있으면 무조건 새 블록을
  // 추가하도록 구분해요.
  const handleEmptyAreaClick = () => {
    const last = blocks[blocks.length - 1];
    const isEmptyWritable =
      last && last.type === "TEXT" && isBlockContentEmpty(last.content) && !last.pageId;
    if (isEmptyWritable) {
      focusBlock(last.id);
      return;
    }
    addBlockAtEnd("TEXT");
  };

  const handleChange = (block, value) => {
    // 슬래시 메뉴는 빈 블록에 "/"를 처음 칠 때만 열려요(문장 중간의
    // "/"는 무시). 일단 열린 다음에는 "/h1"처럼 계속 이어 칠 때마다
    // query가 갱신돼야 필터링/키보드 선택이 되니까, 이미 열려 있는
        // 동안엔 wasEmpty 조건과 상관없이 계속 추적해요.
    const wasEmpty = isBlockContentEmpty(block.content);
    const isSlashActive = slashMenu?.blockId === block.id;

    // 요청: "블록 생성에 대한 ctrl z" — 글자 입력도 스냅샷 대상이에요(1초 안에 이어진
    // 입력은 한 덩어리). 슬래시 명령의 첫 "/"는 항상 새 덩어리로 시작해요.
    if (value !== block.content) {
      pushTextUndoSnapshot(block.id, value.startsWith("/") && wasEmpty && !isSlashActive);
    }

    // 요청: "마크다운 단축키" — 빈 텍스트 블록에서 "- ", "1. ", "[] ", "# ", "## ", "### ",
    // "> "(토글), 따옴표+공백(인용), "```"(코드), "---"(구분선)를 치면 그 자리에서 블록
    // 타입이 바뀌어요. 글자를 지우는 중(내용이 줄어드는 입력)엔 동작하지 않아요.
    // 요청: "표나 콜아웃 같은 다른 블록에서도" — 텍스트 블록뿐 아니라 빈 콜아웃·인용·토글·제목·목록
    // 블록에서도 같은 단축키로 그 블록 타입을 바로 바꿔요(이미 같은 타입이면 그대로 둬요).
    // 콜아웃은 타입이 바뀌면서 배경색도 같이 지워요(Backspace로 일반 텍스트가 될 때와 같아요).
    // 구분선·코드는 안에 자식이 있는 블록에는 쓸 수 없어서 자식이 있으면 바꾸지 않아요.
    if (RICH_TEXT_TYPES.includes(block.type) && !block.pageId && stripHtml(value).length > stripHtml(block.content).length) {
      const shortcut = matchMarkdownShortcut(value);
      const blockIndex = blocks.findIndex((b) => b.id === block.id);
      const hasChildren = (blocks[blockIndex + 1]?.indent || 0) > (block.indent || 0);
      const cannotHaveChildren = shortcut?.type === "DIVIDER" || shortcut?.type === "CODE";
      if (shortcut && shortcut.type !== block.type && !(cannotHaveChildren && hasChildren)) {
        if (shortcut.type === "DIVIDER") {
          updateBlock(block.id, { type: "DIVIDER", content: "", ...(block.type === "CALLOUT" ? { color: null } : {}) });
          insertBlockAfter(block.id, "TEXT");
          return;
        }
        updateBlock(block.id, {
          type: shortcut.type,
          content: "",
          ...(block.type === "CALLOUT" ? { color: null } : {}),
          ...(shortcut.type === "CODE" ? {} : { richText: true }),
          ...(shortcut.type === "TODO" ? { checked: false } : {}),
          ...(shortcut.type === "TOGGLE" ? { collapsed: false } : {}),
        });
        focusBlock(block.id);
        return;
      }
    }

    // 노션처럼 문장 중간(공백 뒤)에서 "/"를 쳐도 메뉴가 열려요. 그땐 앞의 글자는 그대로 두고, 고른 블록이
    // 바로 아래에 새로 생겨요(convertBlock의 mid 처리). 코드 블록 안에서는 열리지 않아요.
    const plainNow = stripHtml(value).replace(/\u00a0/g, " ");
    const midMatch = block.type !== "CODE" ? /(^|\s)\/([^\s/]*)$/.exec(plainNow) : null;
    const hasTextBefore = midMatch ? plainNow.slice(0, midMatch.index + midMatch[1].length).trim() !== "" : false;
    if (block.type !== "CODE" && value.startsWith("/") && (wasEmpty || isSlashActive)) {
      setSlashMenu({ blockId: block.id, query: value.slice(1) });
      setSlashIndex(0);
    } else if (midMatch && hasTextBefore && (isSlashActive || midMatch[2] === "")) {
      setSlashMenu({ blockId: block.id, query: midMatch[2], mid: true });
      setSlashIndex(0);
    } else if (isSlashActive) {
      setSlashMenu(null);
    }

    // RICH_TEXT_TYPES 블록(TEXT/H1/H2/TODO/BULLET/NUMBERED/QUOTE)은
    // RichTextInput이 넘겨주는 value가 이제 HTML이라, richText:true로
    // 표시해둬요 — 다음에 이 페이지를 다시 열 때 위 useState 초기화가
    // 이미 HTML인 이 내용을 또 이스케이프하지 않게(이중 이스케이프
    // 방지) 막아주는 표시예요. CODE는 여전히 순수 텍스트라 안 붙여요.
    const isRich = block.type !== "CODE";
    updateBlock(block.id, { content: value, ...(isRich ? { richText: true } : {}) });
  };

  // 블록 맨 앞에서 Backspace — 바로 위(눈에 보이는) 블록 끝에 이 블록의 내용을 이어붙이고 이
  // 블록은 없애요. 이 블록의 자식은 위 블록 밑으로 붙어요(normalizeIndents가 깊이를 맞춰줘요).
  // 위가 구분선이면 구분선을 지우고, 위가 카드/이미지 같은 편집 못 하는 블록이면 아무것도 안 해요.
  const mergeWithPrevious = (block) => {
    const index = blocks.findIndex((b) => b.id === block.id);
    const hidden = computeHiddenBlockIds(blocks);
    let pi = index - 1;
    while (pi >= 0 && hidden.has(blocks[pi].id)) pi -= 1;
    if (pi < 0) return;
    const prev = blocks[pi];

    if (prev.type === "DIVIDER") {
      pushUndoSnapshot();
      setBlocks((list) => list.filter((b) => b.id !== prev.id));
      return;
    }
    if (!RICH_TEXT_TYPES.includes(prev.type) || prev.pageId) return;

    const junction = inputRefs.current[prev.id]?.textContent?.length ?? 0;
    const merged = (prev.content || "") + (block.content || "");
    pushUndoSnapshot();
    setBlocks((list) =>
      list
        .filter((b) => b.id !== block.id)
        .map((b) => (b.id === prev.id ? { ...b, content: merged, richText: true } : b)),
    );
    requestAnimationFrame(() => {
      const el = inputRefs.current[prev.id];
      if (el) restoreCaretOffset(el, junction);
    });
  };

  // Delete 키로 블록 맨 끝에서 다음 블록을 이 블록 뒤에 이어붙여요(커서는 이어붙은 자리에 남아요).
  // 이어붙일 수 없는 다음 블록(구분선·카드·하위 페이지 등)이면 false를 돌려줘서 기본 동작에 맡겨요.
  const mergeNextIntoCurrent = (block) => {
    const index = blocks.findIndex((b) => b.id === block.id);
    const hidden = computeHiddenBlockIds(blocks);
    let ni = index + 1;
    while (ni < blocks.length && hidden.has(blocks[ni].id)) ni += 1;
    const next = blocks[ni];
    if (!next || !RICH_TEXT_TYPES.includes(next.type) || next.pageId) return false;

    const junction = inputRefs.current[block.id]?.textContent?.length ?? 0;
    const merged = (block.content || "") + (next.content || "");
    pushUndoSnapshot();
    setBlocks((list) =>
      list
        .filter((b) => b.id !== next.id)
        .map((b) => (b.id === block.id ? { ...b, content: merged, richText: true } : b)),
    );
    requestAnimationFrame(() => {
      const el = inputRefs.current[block.id];
      if (el) {
        el.focus();
        restoreCaretOffset(el, junction);
      }
    });
    return true;
  };

  // 키 처리 본체는 hooks/blockKeyDown.js에 있어요 — 필요한 상태·함수를 매 렌더마다 묶어 넘겨요.
  const handleKeyDown = createBlockKeyDownHandler({
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
  });

  const handleFocus = (block) => {
    setFocusedBlockId(block.id);
  };

  const handleBlur = (block) => {
    setFocusedBlockId((id) => (id === block.id ? null : id));

    // 슬래시 메뉴 버튼 클릭이 먼저 처리되도록 약간 지연 후 닫는다
    setTimeout(() => {
      setSlashMenu((m) => (m?.blockId === block.id ? null : m));
    }, 150);
  };

  const handleImageSelect = (block, file) => {
    if (!file) return;

    pushUndoSnapshot();
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(block.id, {
        image: {
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          url: reader.result,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  // 파일/이미지 블록의 "링크" 탭 — 컴퓨터에서 올리는 대신 이미 어딘가에
  // 있는 URL을 그대로 임베드해요(노션의 "/file" "링크" 탭과 같은 자리).
  // 파일 이름은 URL 마지막 조각에서 뽑아 쓰고(쿼리스트링 제거), 실패하면
  // "파일"로 대체해요 — 용량은 URL만으론 알 수 없어서 빈 문자열로 둬요.
  const handleImageUrlEmbed = (block, url) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    let fileName;
    try {
      fileName = decodeURIComponent(trimmed.split("/").pop()?.split("?")[0] || "파일");
    } catch {
      // %가 들어간 주소처럼 해석할 수 없는 이름이면 원문 그대로 써요.
      fileName = trimmed.split("/").pop()?.split("?")[0] || "파일";
    }
    pushUndoSnapshot();
    updateBlock(block.id, { image: { fileName, fileSize: "", url: trimmed } });
  };

  // 노션처럼, 텍스트 블록에 커서를 둔 채로 이미지를 붙여넣거나(Ctrl+V)
  // 파일을 페이지 위에 바로 끌어다 놓으면 "이미지" 타입을 슬래시 메뉴에서
  // 먼저 고를 필요 없이 새 이미지 블록이 만들어지면서 바로 임베드돼요.
  // insertBlockAfter/handleImageSelect를 합친 모양이에요 — 새 블록을
  // 만들자마자 그 자리의 id로 이미지를 채워요.
  const insertImageBlockAfter = (id, file) => {
    if (!file) return;
    const newId = nextId();

    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const next = [...prev];
      next.splice(index === -1 ? prev.length : index + 1, 0, createEmptyBlock(newId, "IMAGE", onCreateChildPage));
      return next;
    });

    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(newId, {
        image: { fileName: file.name, fileSize: formatFileSize(file.size), url: reader.result },
      });
    };
    reader.readAsDataURL(file);
  };

  // 커서가 있는 블록에서 클립보드에 이미지가 있을 때만 가로채요 — 일반
  // 텍스트 붙여넣기는 건드리지 않고 그대로 기본 동작으로 흘려보내요.
  // 붙여넣기 — 이미지가 있으면 이미지 블록으로, 여러 줄 텍스트면 "줄마다 블록"으로 나눠서
  // 붙여요(노션과 같아요). 각 줄 앞머리의 마크다운 표기(- , 1. , [ ] , # , > )는 해당 타입으로
  // 바뀌어요. 한 줄짜리 붙여넣기는 그대로 커서 위치에 글자로 들어가요(RichTextInput 기본).
  // 클립보드에서 우리 블록 JSON을 꺼내요(없거나 깨졌으면 null).
  const readClipboardBlocks = (clipboardData) => {
    try {
      const raw = clipboardData?.getData(BLOCKS_CLIPBOARD_TYPE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) return null;
      // 붙여넣은 JSON은 믿을 수 없는 값이라 모양을 바로잡고 서식 HTML을 걸러요(normalizeBlockShape).
      const safe = parsed.blocks.map(normalizeBlockShape).filter(Boolean);
      return safe.length > 0 ? safe : null;
    } catch {
      return null;
    }
  };

  // anchorBlockId 블록(과 그 자식들) 바로 뒤에 붙여넣은 블록들을 끼워 넣어요. 앵커가 빈 텍스트 블록이면
  // 그 자리를 대체해요. 붙여넣은 묶음의 첫 줄 들여쓰기는 앵커의 들여쓰기에 맞춰요.
  const insertPastedBlocks = (items, anchorBlockId) => {
    if (!items || items.length === 0) return;
    const created = items.map((b) => clonePageLinks({ ...b, id: nextId() }));
    const lastEditable = [...created].reverse().find((b) => RICH_TEXT_TYPES.includes(b.type) || b.type === "CODE");
    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === anchorBlockId);
      if (index === -1) return [...prev, ...created];
      const anchor = prev[index];
      const base = anchor.indent || 0;
      const shifted = created.map((b) => {
        const indent = (b.indent || 0) + base;
        const { indent: _drop, ...rest } = b;
        return indent > 0 ? { ...rest, indent } : rest;
      });
      const end = getSubtreeRange(prev, index);
      const replace =
        anchor.type === "TEXT" && !anchor.pageId && isBlockContentEmpty(anchor.content) && end === index + 1;
      const next = [...prev];
      if (replace) next.splice(index, 1, ...shifted);
      else next.splice(end, 0, ...shifted);
      return next;
    });
    if (lastEditable) focusBlock(lastEditable.id, "end");
  };

  const handlePasteImage = (block, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItem = Array.from(items).find(
      (item) => item.kind === "file" && item.type?.startsWith("image/"),
    );
    if (imageItem) {
      e.preventDefault();
      insertImageBlockAfter(block.id, imageItem.getAsFile());
      return;
    }

    if (block.type === "CODE" || !RICH_TEXT_TYPES.includes(block.type) || block.pageId) return;
    const el = e.currentTarget;
    if (!el?.isContentEditable) return;

    // 우리 에디터에서 복사한 블록들이면 구조 그대로 붙여넣어요(빈 텍스트 블록이면 그 자리를 대체).
    const copiedBlocks = readClipboardBlocks(e.clipboardData);
    if (copiedBlocks) {
      e.preventDefault();
      insertPastedBlocks(copiedBlocks, block.id);
      return;
    }

    const raw = e.clipboardData.getData("text/plain") ?? "";
    if (!/[\r\n]/.test(raw)) return;
    const lines = raw
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "");

    e.preventDefault();
    if (lines.length === 0) return;
    if (lines.length === 1) {
      document.execCommand("insertText", false, lines[0]);
      return;
    }

    const split = splitContentAtCaret(el) || { before: block.content || "", after: "" };
    const baseType = LIST_TYPES.includes(block.type) ? block.type : "TEXT";
    const firstParsed = isBlockContentEmpty(split.before)
      ? parseMarkdownLine(lines[0])
      : { type: null, text: lines[0] };
    const mergedFirst = split.before + escapePlainTextToHtml(firstParsed.text);

    const created = [];
    lines.slice(1).forEach((line, i) => {
      const parsed = parseMarkdownLine(line);
      const isLast = i === lines.length - 2;
      const type = parsed.type || baseType;
      const id = nextId();
      created.push({
        ...createEmptyBlock(id, type, onCreateChildPage),
        content: escapePlainTextToHtml(parsed.text) + (isLast ? split.after : ""),
        richText: true,
        ...(block.indent ? { indent: block.indent } : {}),
        ...(type === "TODO" ? { checked: !!parsed.checked } : {}),
      });
    });
    const lastLine = parseMarkdownLine(lines[lines.length - 1]);
    const lastId = created[created.length - 1].id;
    const lastLen = lastLine.text.length;

    pushUndoSnapshot();
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === block.id);
      if (index === -1) return prev;
      const next = [...prev];
      const at = getSubtreeRange(prev, index);
      next.splice(at, 0, ...created);
      next[index] = {
        ...next[index],
        content: mergedFirst,
        richText: true,
        ...(firstParsed.type && block.type === "TEXT" ? { type: firstParsed.type } : {}),
        ...(firstParsed.type === "TODO" ? { checked: !!firstParsed.checked } : {}),
      };
      return next;
    });
    requestAnimationFrame(() => {
      const target = inputRefs.current[lastId];
      if (target) restoreCaretOffset(target, lastLen);
    });
  };

  // 컴퓨터 파일 탐색기에서, 또는 다른 브라우저 탭/웹페이지에서 이미지를
  // 페이지 위로 끌어다 놓은 경우들을 처리해요. 아래 세 함수가 같이
  // 동작해요:
  //  - resolveDropAnchor: 마우스를 놓은 지점(clientX/clientY) 아래에
  //    어떤 .block-row가 있는지 document.elementFromPoint로 찾아서,
  //    그 블록의 앞/뒤 중 어디에 끼워 넣을지 계산해요. 드롭 지점을 못
  //    찾으면(예: 블록 없는 빈 하단 영역) null을 돌려주고, 이땐
  //    맨 끝에 추가돼요.
  //  - spliceBlockAt: 그 앵커에 맞춰 실제로 배열에 끼워 넣어요.
  //  - extractDroppedImageUrl: OS 파일이 아니라(dataTransfer.files가
  //    비어있는) 웹페이지의 <img>를 바로 끌어다 놓은 경우, 브라우저가
  //    대신 넣어주는 text/uri-list나 text/html의 <img src>에서 URL을
  //    꺼내요.
  // 이전엔 항상 맨 끝에만 추가돼서, 블록이 많은 페이지에서 드롭해도
  // 스크롤을 안 내리면 안 보이는 게 "임베드가 안 된다"로 오해됐었어요.
  const spliceBlockAt = (prev, newBlock, anchor) => {
    const next = [...prev];
    if (anchor?.atStart) {
      next.unshift(newBlock);
    } else if (anchor?.afterBlockId != null) {
      const index = next.findIndex((b) => b.id === anchor.afterBlockId);
      next.splice(index === -1 ? next.length : index + 1, 0, newBlock);
    } else {
      next.push(newBlock);
    }
    return next;
  };

  const resolveDropAnchor = (e) => {
    const rowEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".block-row");
    if (!rowEl) return null;

    const hoveredId = Number(rowEl.dataset.blockId);
    const rect = rowEl.getBoundingClientRect();
    const isAfter = e.clientY - rect.top > rect.height / 2;
    if (isAfter) return { afterBlockId: hoveredId };

    const index = blocks.findIndex((b) => b.id === hoveredId);
    if (index <= 0) return { atStart: true };
    return { afterBlockId: blocks[index - 1].id };
  };

  const extractDroppedImageUrl = (dataTransfer) => {
    const uriList = dataTransfer.getData("text/uri-list") || dataTransfer.getData("URL");
    if (uriList) {
      const url = uriList.split("\n").find((line) => line && !line.startsWith("#"));
      if (url) return url.trim();
    }

    const html = dataTransfer.getData("text/html");
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) return match[1];
    }

    return null;
  };

  const insertImageBlocksFromFiles = (files, anchor) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type?.startsWith("image/"));
    let currentAnchor = anchor;

    imageFiles.forEach((file) => {
      const newId = nextId();
      setBlocks((prev) => spliceBlockAt(prev, createEmptyBlock(newId, "IMAGE", onCreateChildPage), currentAnchor));
      currentAnchor = { afterBlockId: newId }; // 여러 장을 한 번에 드롭하면 순서대로 이어 꽂혀요.

      const reader = new FileReader();
      reader.onload = () => {
        updateBlock(newId, {
          image: { fileName: file.name, fileSize: formatFileSize(file.size), url: reader.result },
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const insertImageBlockFromUrl = (url, anchor) => {
    if (!url) return;
    const newId = nextId();
    setBlocks((prev) => spliceBlockAt(prev, createEmptyBlock(newId, "IMAGE", onCreateChildPage), anchor));

    const fileName = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "image");
    updateBlock(newId, { image: { fileName, fileSize: "", url } });
  };

  // 요청: "빈 공간에서 드래그하면 여러 블록을 클릭 가능하게, 텍스트
  // 위에서는(포인터가 텍스트 커서일 때) 드래그해도 텍스트를 선택하게" —
  // 이 mousedown이 실제 텍스트/입력 요소 위에서 시작했으면(브라우저가
  // 커서를 I-beam으로 보여주는 바로 그 자리) 아무것도 안 하고 그냥
  // 리턴해서 기본 텍스트 선택 동작을 그대로 둬요. 그 외(블록 사이 여백,
  // .block-row의 왼쪽 여백, 표/카드의 테두리·여백, 맨 아래 빈 영역 등)
  // 에서 시작하면 사각형 드래그 선택을 시작해요.
  // 여러 블록에 걸친 텍스트 선택(편집 호스트 전환, 범위 삭제, Shift+방향키 확장)은
  // hooks/useMultiBlockTextSelection.js에 모여 있어요.
  const { multiBlockHostRef, setEditorSingleHost, releaseEditorSingleHost, countRichBlocksInSelection } =
    useMultiBlockTextSelection({ editorRef, inputRefs, blocks, setBlocks, pushUndoSnapshot, deleteOwnedPages, setSelectionToolbar,
      // 여러 블록 글자 선택 중 Esc → 그 블록들을 블록 다중 선택으로
      onEscapeToBlockSelection: (ids, anchorId, focusId) => {
        setSelectedBlockIds(new Set(ids));
        selectionAnchorIdRef.current = anchorId;
        selectionCursorRef.current = { anchor: anchorId, focus: focusId };
      },
    });

  const handleSelectionMouseDown = (e) => {
    if (e.button !== 0) return; // 왼쪽 버튼만.

    // 여러 블록 텍스트 선택 때문에 에디터 전체를 하나의 편집 호스트로
    // 바꿔둔 상태(setEditorSingleHost)에서 새로 클릭하면, 브라우저 기본
    // 동작(커서 놓기·새 드래그 시작)이 일어나기 전에 먼저 원래대로(블록마다
    // 따로 편집) 되돌려요. 선택도 먼저 비워요 — 선택된 텍스트 위를 누른
    // 채 끌면 브라우저가 "선택한 글자 끌어서 옮기기"를 시작해서 블록
    // 사이로 글자가 옮겨지는 걸 실제로 재현했어요. 서식 툴바
    // (data-popover-portal)를 누르는 건 예외 — 그건 지금 선택에 서식을
    // 적용하려는 거라 선택과 호스트 상태를 그대로 둬야 해요.
    if (multiBlockHostRef.current && !e.target.closest("[data-popover-portal]")) {
      window.getSelection()?.removeAllRanges();
      setEditorSingleHost(false);
    }

    // 요청: 노션 도움말에 나온 shift+클릭(범위 선택)/cmd·alt+shift+클릭
    // (낱개 토글)도 지원해요. 텍스트 위에서 눌러도(입력창 등) 동작해야
    // 하니 아래 "입력 요소 위에서는 무시" 로직보다 먼저 처리하고,
    // preventDefault로 브라우저 기본 텍스트 선택이 같이 번지는 걸
    // 막아요.
    if (e.shiftKey) {
      const rowEl = e.target.closest(".block-row[data-block-id]");
      if (rowEl) {
        e.preventDefault();
        const clickedId = Number(rowEl.dataset.blockId);
        if (e.metaKey || e.altKey) {
          // cmd+shift+클릭(맥) / alt+shift+클릭(윈도우·리눅스) — 그
          // 블록 하나만 선택에 토글.
          setSelectedBlockIds((prev) => {
            const next = new Set(prev);
            if (next.has(clickedId)) next.delete(clickedId);
            else next.add(clickedId);
            return next;
          });
        } else {
          // shift+클릭 — 마지막 기준점(anchor)부터 클릭한 블록까지
          // 문서 순서로 전부 선택(노션과 같아요: "shift+클릭으로 다른
          // 블록을 선택하면 그 사이 블록이 전부 선택돼요").
          const ids = blocks.map((b) => b.id);
          const anchorId = selectionAnchorIdRef.current ?? clickedId;
          const anchorIndex = ids.indexOf(anchorId);
          const clickedIndex = ids.indexOf(clickedId);
          if (anchorIndex === -1 || clickedIndex === -1) {
            setSelectedBlockIds(new Set([clickedId]));
          } else {
            const [from, to] =
              anchorIndex < clickedIndex ? [anchorIndex, clickedIndex] : [clickedIndex, anchorIndex];
            setSelectedBlockIds(new Set(ids.slice(from, to + 1)));
          }
        }
        selectionAnchorIdRef.current = clickedId;
        return;
      }
    }

    // 버그 수정: 드래그 핸들(⋯) 위에서 누르는 mousedown은 선택을 아예
    // 건드리지 않아요. 몇 개가 선택돼 있느냐에 따라 "선택 전체에 적용될
    // 일괄 메뉴"를 열지, "그 블록 하나만의 메뉴"를 열지는 핸들의
    // onClick(onToggleMore)이 직접 판단해요. 그런데 이 mousedown이
    // onClick보다 먼저 실행되면서 매번 선택을 비워버렸더니, 여러 블록을
    // 드래그로 선택하고 핸들을 눌러도 onToggleMore가 실행되는 시점엔
    // 이미 선택이 비어 있어서 "선택 없음"으로 판단해 늘 그 블록 하나만의
    // 메뉴가 열렸고, 배경색·글자색을 바꿔도 그 블록에만 적용됐어요
    // (요청: "드래그로 선택한 모든 블록이 적용 되게"). 그래서 핸들
    // 위에서는 여기서 아무것도 안 하고 그대로 onClick에 판단을 맡겨요.
    if (e.target.closest(".block-drag-handle")) return;
    // 버그 수정(요청: "여러 블록 선택후 복제하기를 누르면 [0개 블록
    // 선택됨]으로 바뀌면서 메뉴가 안 닫힘") — 핸들 메뉴(배경색·글자색·
    // 복제하기·삭제 등)는 카드 밖으로 안 잘리게 PopoverPortal이
    // document.body로 따로 그리는데, React는 포털 안 이벤트도 실제 DOM이
    // 아니라 "리액트 엘리먼트 트리" 기준으로 버블링해서 이 mousedown
    // 핸들러가 여전히 실행돼요. 위 드래그 핸들과 똑같은 이유로, 메뉴 안
    // 버튼을 누르는 mousedown도 선택을 건드리면 안 돼요 — 그 버튼의
    // onClick(예: onBulkDuplicate)이 실행되기 전에 selectedBlockIds가
    // 먼저 비워져서 "0개 블록 선택됨"으로 보이고, 복제도 빈 선택으로
    // 실행돼 아무 일도 안 일어났어요.
    if (e.target.closest("[data-popover-portal]")) return;
    // 그 외의 새 클릭(또는 드래그 시작)은 기존에 선택돼 있던 블록을 일단
    // 비워요 — 드래그가 이어지면 아래 useEffect가 새로 채워요.
    if (selectedBlockIds.size > 0) setSelectedBlockIds(new Set());
    selectionAnchorIdRef.current = null;

    // 요청: "블록 드래그가 아니라 노션처럼 텍스트만 다중 선택되고,
    // 그 상태에서 인라인 편집기가 뜨는 형태" + "평범한 웹사이트처럼 여러
    // 줄을 드래그할 수 있게" — 텍스트 위에서 시작한 드래그는 기본적으로
    // 브라우저 네이티브 선택에 맡겨요.
    //
    // 버그 수정(요청: "12/34/56에서 6부터 위로 드래그할 때 커서 위치에
    // 따라 선택이 됐다 안 됐다 한다") — 실제 크로미움으로 재현해서
    // 원인을 확인했어요. 블록마다 contentEditable이 따로(= 편집 영역
    // "호스트"가 블록마다 따로)라서, 크롬은 선택이 편집 호스트 경계를
    // 넘어가는 걸 허용하지 않고 항상 "드래그를 시작한 블록 안"으로
    // 잘라버려요. 예전엔 caretRangeFromPoint로 선택을 직접 이어 그렸는데,
    // anchor/focus 값은 우리가 넣은 대로 들어가도 실제 범위
    // (getRangeAt·toString)는 여전히 "56"으로 잘려 있었어요 — 그래서
    // 화면에 칠해지는 것과 툴바·서식이 보는 범위가 서로 어긋나고, 위치에
    // 따라 됐다 안 됐다 하는 것처럼 보였던 거예요.
    //
    // 해결: 드래그가 시작한 블록 밖으로 나가는 순간, 에디터 전체
    // (.block-editor)를 잠깐 "하나의 편집 호스트"로 만들어요
    // (setEditorSingleHost). 모든 블록이 같은 호스트 안에 들어가니 크롬이
    // 더 이상 선택을 자르지 않고, 그다음부터는 브라우저 네이티브 드래그
    // 선택이 평범한 웹사이트와 똑같이 여러 블록에 걸쳐 그대로 이어져요
    // (좌표 계산 같은 흉내 코드가 전혀 필요 없어요). 같은 블록 안에서만
    // 끝나는 드래그/클릭은 이 전환 자체가 안 일어나서 평소 편집과 완전히
    // 똑같아요. 여러 블록이 선택된 채로 남아 있는 동안에는 타이핑·붙여넣기·
    // 텍스트 끌어서 옮기기를 막아서(아래 beforeinput/dragstart 가드) 블록
    // DOM이 섞이지 않게 하고, 선택이 풀리거나 한 블록 안으로 줄어들면
    // 바로 원래 상태(블록마다 따로 편집)로 되돌려요
    // (releaseEditorSingleHost).
    const editableTarget = e.target.closest("input, textarea, [contenteditable='true'], button, a, select");
    if (editableTarget) {
      if (e.target.closest("button, a, select")) return;
      // 여러 블록에 걸친 드래그는 리치 텍스트 블록(RichTextInput)에서
      // 시작한 경우만 지원해요 — 코드 블록 textarea 같은 곳은 원래대로
      // 브라우저 기본 동작에 맡겨요.
      if (!e.target.closest("[data-rich-block-id]")) return;
      const startRowEl = e.target.closest(".block-row[data-block-id]");
      if (!startRowEl) return;

      // 드래그가 끝나야 툴바가 뜨게(위 textSelectionDraggingRef 주석
      // 참고) — 드래그 시작 순간 일단 꺼두고, 혹시 이전 선택에서 떠 있던
      // 툴바가 있으면 같이 숨겨요.
      textSelectionDraggingRef.current = true;
      setSelectionToolbar(null);

      const startRect = startRowEl.getBoundingClientRect();

      const handleMove = (moveEvent) => {
        const margin = 3;
        const outOfStartRow =
          moveEvent.clientY < startRect.top - margin || moveEvent.clientY > startRect.bottom + margin;
        if (!outOfStartRow) return; // 아직 시작한 블록 안 — 평소 네이티브 선택 그대로.

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return;
        const anchorNode = sel.anchorNode;
        const anchorOffset = sel.anchorOffset;

        // 딱 한 번만 전환하면 돼요 — 그 뒤로는 네이티브 드래그가 알아서
        // 이어가니 이 리스너는 바로 떼요.
        document.removeEventListener("mousemove", handleMove);
        setEditorSingleHost(true);

        // 전환하는 이 순간의 선택은 아직 "시작 블록 안으로 잘린" 상태라,
        // 지금 마우스 위치까지 한 번만 맞춰줘요. 다음 mousemove부터는
        // 브라우저가 같은 anchor를 기준으로 계속 늘려가요.
        const focusRange = document.caretRangeFromPoint?.(moveEvent.clientX, moveEvent.clientY);
        if (focusRange) {
          try {
            sel.setBaseAndExtent(anchorNode, anchorOffset, focusRange.startContainer, focusRange.startOffset);
          } catch {
            // 유효하지 않은 지점이면 무시 — 다음 mousemove에서 네이티브가 맞춰줘요.
          }
        }
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        textSelectionDraggingRef.current = false;
        // 결국 한 블록 안에서만 끝났으면(또는 그냥 클릭이었으면) 바로
        // 원래대로 되돌려서 평소처럼 타이핑할 수 있게 해요.
        if (multiBlockHostRef.current && countRichBlocksInSelection() < 2) releaseEditorSingleHost();
        // 드래그 끝 — 이제서야 최종 선택 범위로 툴바를 한 번 계산해서
        // 띄워요(선택이 비어 있으면 updateSelectionToolbar 안에서 알아서
        // 숨겨져요).
        updateSelectionToolbar();
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      return;
    }

    selectionStartRef.current = { x: e.clientX, y: e.clientY };
    const rows = editorRef.current?.querySelectorAll(".block-row[data-block-id]") || [];
    selectionBlockRectsRef.current = Array.from(rows).map((el) => ({
      id: Number(el.dataset.blockId),
      rect: el.getBoundingClientRect(),
    }));
    setIsBoxSelecting(true);
  };

  // 요청: "인라인 서식" — 텍스트를 마우스로 드래그해서 선택하면(또는
  // Shift+화살표 등 키보드로 선택해도) 그 위에 서식 툴바가 뜨게 해요.
  // 브라우저의 selectionchange는 "지금 화면에 뭔가 선택됐다/풀렸다"를
  // 안다는 뜻이라 여기서 한 번만 들으면 모든 블록을 다 커버해요(블록마다
  // 따로 리스너를 안 달아도 돼요). 선택이 우리 리치 텍스트 블록
  // (data-rich-block-id) 안에서 일어난 게 아니면(예: 페이지 제목, 댓글
  // 입력창, 아예 선택 없음) 툴바를 숨겨요.
  // 요청: "노션처럼 블록이 아니라 텍스트만 다중 선택이 되고, 그 상태에서
  // 인라인 편집기가 떠서 편집" — 예전엔 선택 범위의 commonAncestorContainer
  // 에서 위로 올라가며 [data-rich-block-id] 하나를 찾았는데, 선택이 두
  // 블록 이상에 걸치면 공통 조상은 항상 그 블록들보다 위(.block-editor
  // 쪽)라 이 방식으로는 절대 못 찾고 매번 툴바가 숨겨졌어요. 이제는
  // "range와 실제로 겹치는 모든 리치 텍스트 블록"을 직접 찾아요
  // (Range.intersectsNode) — 블록이 1개면 지금까지와 완전히 같은
  // 단일-블록 선택이고, 2개 이상이면 새로 지원하는 여러 블록에 걸친
  // 선택이에요. 서식 적용(아래 selectionToolbar 사용처)도 이 blocks
  // 배열의 길이로 두 경우를 갈라요 — 1개면 기존 execCommand 기반
  // toggleBold 등을 그대로 쓰고, 2개 이상이면 RichTextInput.jsx의
  // applyMarkAcrossBlocks(블록 경계를 넘어도 안전한 수동 Range 처리)를
  // 써요.
  // handleSelectionMouseDown(마우스 뗄 때)에서도 똑같은 계산을 다시 써야
  // 해서(위 textSelectionDraggingRef 주석 참고) useEffect 안에 가둬두지
  // 않고 컴포넌트 함수로 빼뒀어요 — useCallback으로 감싸서 매 렌더마다
  // 새 함수가 되지 않게 하고(아래 effect의 의존성 배열을 안정적으로
  // 유지), setSelectionToolbar 등 참조하는 값은 전부 ref/setState라
  // 의존성이 없어요.
  const updateSelectionToolbar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelectionToolbar(null);
      return;
    }
    const candidates = editorRef.current?.querySelectorAll("[data-rich-block-id]") || [];
    const blocks = Array.from(candidates)
      .filter((el) => range.intersectsNode(el))
      .map((el) => ({ blockId: Number(el.dataset.richBlockId), rootEl: el }));
    if (blocks.length === 0) {
      setSelectionToolbar(null);
      return;
    }
    // 2줄 이상 걸친 선택(여러 블록이거나 줄바꿈된 긴 글)이면 툴바가 선택 글자를 가리지 않게 에디터 오른쪽으로 빼요.
    // 위치는 통째로 선택된 블록 상자가 아니라 "선택된 글자"의 경계로 잡아요(툴바가 글자 바로 옆에 오게).
    const text = selectionTextBounds(range, editorRef.current) || rect;
    const lineHeight = parseFloat(window.getComputedStyle(blocks[0].rootEl).lineHeight) || 24;
    const multiLine = blocks.length > 1 || text.height > lineHeight * 1.5;
    setSelectionToolbar({
      rect: { top: text.top, bottom: text.bottom, left: text.left, width: text.width },
      blocks,
      sideRight: multiLine ? editorRef.current?.getBoundingClientRect().right ?? null : null,
    });
  }, []);

  useEffect(() => {
    // 버그 수정: 텍스트 드래그 도중(handleSelectionMouseDown이
    // textSelectionDraggingRef를 true로 켜둔 동안)에는 selectionchange가
    // 아무리 자주 와도 무시해요 — 그동안 계속 갱신하면 마우스가 블록
    // 경계를 넘나들 때마다 툴바가 열렸다 닫혔다 깜빡였어요. 드래그가
    // 끝나면 handleUp이 이 함수를 직접 한 번 호출해서 최종 선택으로만
    // 띄워요.
    const handleSelectionChange = () => {
      if (textSelectionDraggingRef.current) return;
      // 여러 블록 선택이 풀렸거나(클릭으로 커서만 남음, 화살표 키,
      // 에디터 밖 클릭 등) 한 블록 안으로 줄어들었으면 하나의 편집
      // 호스트 상태를 바로 풀어서 평소처럼 편집되게 해요.
      if (multiBlockHostRef.current) {
        const sel = window.getSelection();
        let count = 0;
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const els = editorRef.current?.querySelectorAll("[data-rich-block-id]") || [];
          count = Array.from(els).filter((el) => range.intersectsNode(el)).length;
        }
        if (count < 2) releaseEditorSingleHost();
      }
      updateSelectionToolbar();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateSelectionToolbar, releaseEditorSingleHost]);

  // 블록 선택 관련 키보드·복붙·사각형 드래그 이펙트는 hooks/useBlockSelectionShortcuts.js에 모여 있어요.
  useBlockSelectionShortcuts({
    blocks,
    isMenuOpen: !!(blockMenu || bulkMenu),
    editorRef,
    inputRefs,
    selection: {
      selectedBlockIds,
      setSelectedBlockIds,
      isBoxSelecting,
      setIsBoxSelecting,
      setSelectionBox,
      selectionStartRef,
      selectionBlockRectsRef,
      selectionAnchorIdRef,
      selectionCursorRef,
    },
    actions: {
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
    },
  });

  const numbers = computeNumbers(blocks);

  // 요청: "블록 종류가 노션보다 적어요"(토글) — 접힌 토글의 자식들은
  // blocks 배열에서 안 지우고 렌더링만 건너뛰어요(위 computeHiddenBlockIds
  // 참고). numbers/rowPaintKeys는 여전히 전체 blocks 기준으로 계산해요
  // (번호 매기기 카운터가 숨겨진 항목과도 이어져야 다시 펼쳤을 때 번호가
  // 안 튀어요) — 오직 "화면에 그릴지"만 이 Set으로 걸러요.
  const hiddenBlockIds = computeHiddenBlockIds(blocks);

  // 요청: "덩어리가 되면 핸들 버튼을 누를 때 덩어리 전체가 색이 변하면
  // 좋을 듯" / "블록 전체가 색이 변하면" — 지금 열린 단일 블록 메뉴
  // (blockMenu)가 있으면 그 블록 + 자식 전체의 인덱스 범위를 구해서,
  // 그 범위 안(자기 자신 제외)의 블록엔 isGroupHighlighted를 내려요.
  // rowPaintKeys는 모든 블록에 대해 blockPaintKey(위 참고)를 한 번씩
  // 미리 계산해서, 각 블록이 바로 위/아래 블록과 이어붙어야 하는지
  // (blendTop/blendBottom)를 O(1)로 비교할 수 있게 해요.
  const openMenuRange = blockMenu
    ? (() => {
        const idx = blocks.findIndex((b) => b.id === blockMenu.blockId);
        if (idx === -1) return null;
        return { start: idx, end: getSubtreeRange(blocks, idx) };
      })()
    : null;
  const rowPaintKeys = blocks.map((b, i) =>
    blockPaintKey(b, !!(openMenuRange && i >= openMenuRange.start && i < openMenuRange.end)),
  );
  const containerOwners = computeContainerOwners(blocks);

  // 요청: "콜아웃/인용을 노션처럼" — 평평한 blocks 배열을 그대로 두고, 렌더링할
  // 때만 콜아웃/인용의 "자식 범위"(getSubtreeRange)를 하나의 박스로 감싸서
  // 그려요. indentBase는 "이 줄이 그려지는 컨테이너 안에서의 기준 들여쓰기"
  // 라서, 박스 안 블록의 들여쓰기는 박스 기준 상대값(indent - indentBase)으로
  // 계산돼요(박스 밖에서는 항상 0).
  const renderDropIndicator = (block, indentBase) =>
    blockDropTarget?.beforeBlockId === block.id && (
      // 요청: "합류할지 말지 선택할 수 있게" — 드롭될 목표 깊이
      // (blockDropTarget.indent)만큼 줄도 같이 들여써서, 드래그
      // 중에 "지금 자식으로 합류하는 중인지 형제로 놓이는 중인지"가
      // 눈에 보이게 해요.
      <div
        className="block-drop-indicator"
        style={
          blockDropTarget.indent - indentBase > 0
            ? { marginLeft: `${(blockDropTarget.indent - indentBase) * 24}px` }
            : undefined
        }
      />
    );

  const renderBlockRow = (index, indentBase) => {
    const block = blocks[index];
    const rawRow = (
          <BlockRow
            block={block}
            number={numbers[index]}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            isFocused={focusedBlockId === block.id}
            remoteEditors={remoteEditors[block.id] ?? null}
            isDragging={draggedGroupIds.has(block.id)}
            isSelected={selectedBlockIds.has(block.id)}
            isGroupHighlighted={!!(openMenuRange && index > openMenuRange.start && index < openMenuRange.end)}
            indentBase={indentBase}
            blendTop={
              index > 0 &&
              rowPaintKeys[index] !== null &&
              rowPaintKeys[index] === rowPaintKeys[index - 1] &&
              containerOwners[index] === containerOwners[index - 1]
            }
            blendBottom={
              index < blocks.length - 1 &&
              rowPaintKeys[index] !== null &&
              rowPaintKeys[index] === rowPaintKeys[index + 1] &&
              containerOwners[index] === containerOwners[index + 1]
            }
            pageLink={block.pageId ? pagesById[block.pageId] : null}
            // pages는 키 입력마다 새 배열이 돼서 모든 줄이 다시 그려지게 만들어요 — 데이터베이스 블록만 필요로 해요.
            pages={block.type === "DATABASE" ? pagesForDb : NO_PAGES}
            onCreateChildPage={onCreateChildPage}
            blockTypeOptions={blockTypeOptions}
            isSlashOpen={slashMenu?.blockId === block.id}
            slashQuery={slashMenu?.blockId === block.id ? slashMenu.query : ""}
            slashIndex={slashIndex}
            onSlashHover={setSlashIndex}
            isMoreOpen={blockMenu?.blockId === block.id}
            moreMode={blockMenu?.blockId === block.id ? blockMenu.mode : "main"}
            onChange={(value) => handleChange(block, value)}
            onKeyDown={(e) => handleKeyDown(e, block)}
            onPasteImage={(e) => handlePasteImage(block, e)}
            onFocus={() => handleFocus(block)}
            onBlur={() => handleBlur(block)}
            onToggleCheck={() => {
              pushUndoSnapshot();
              updateBlock(block.id, { checked: !block.checked });
            }}
            onToggleCollapse={() => updateBlock(block.id, { collapsed: !block.collapsed })}
            onSetCalloutIcon={(icon) => {
              pushUndoSnapshot();
              updateBlock(block.id, { calloutIcon: icon });
            }}
            onSetLanguage={(language) => {
              pushUndoSnapshot();
              updateBlock(block.id, { language });
            }}
            onImageSelect={(file) => handleImageSelect(block, file)}
            onImageUrlEmbed={(url) => handleImageUrlEmbed(block, url)}
            onImageResize={(width) => updateBlock(block.id, { image: { ...block.image, width } })}
            onDatabaseChange={(database) => updateBlock(block.id, { database })}
            onRenameRowPage={onRenameRowPage}
            onDeleteRowPage={onDeleteRowPage}
            sprintTasks={sprintTasks}
            onToggleSubtask={onToggleSubtask}
            onTaskChange={(taskId) => updateBlock(block.id, { taskId })}
            onEventChange={(eventId) => updateBlock(block.id, { eventId })}
            onSprintChange={(sprintId) => updateBlock(block.id, { sprintId })}
            onResetEmbed={() => {
              // TASK/EVENT/SPRINT 카드에서 X(연결 해제) 버튼을 없앤 뒤로,
              // 연결된 걸 바꾸려면 블록을 통째로 지우고 새로 만드는
              // 수밖에 없었어요 — 메뉴에 "다시 선택"을 둬서, 해당 필드만
              // null로 되돌려 피커가 다시 뜨게 해요(블록 자체는 유지).
              if (block.type === "TASK") updateBlock(block.id, { taskId: null });
              else if (block.type === "EVENT") updateBlock(block.id, { eventId: null });
              else if (block.type === "SPRINT") updateBlock(block.id, { sprintId: null });
              setBlockMenu(null);
            }}
            onConvert={(type) => convertBlock(block.id, type)}
            onSwapFileType={(type) => swapImageFileType(block.id, type)}
            onSetColor={(color) => setBlockColor(block.id, color)}
            onSetTextColor={(textColor) => setBlockTextColor(block.id, textColor)}
            onAddBelow={() => {
              insertBlockAfter(block.id);
              setBlockMenu(null);
            }}
            onDelete={() => deleteBlock(block.id)}
            onDuplicate={() => duplicateBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, "up")}
            onMoveDown={() => moveBlock(block.id, "down")}
            onToggleMore={() => {
              // 요청: "여러 블록 선택하고 핸들 버튼 이용이 가능하게" —
              // 2개 이상 선택된 상태에서, 선택에 포함된 블록의 핸들을
              // 누르면 그 블록 하나만의 메뉴 대신 선택 전체에 적용되는
              // 일괄 메뉴(bulkMenu)를 열어요. 선택에 없는 블록의 핸들을
              // 누르면(선택과 무관하게 그 블록 하나만 건드리려는
              // 의도라) 기존 선택은 풀고 평소처럼 단일 메뉴를 열어요.
              if (selectedBlockIds.size > 1 && selectedBlockIds.has(block.id)) {
                setBulkMenu((prev) =>
                  prev?.anchorBlockId === block.id ? null : { anchorBlockId: block.id, mode: "main" },
                );
                return;
              }
              // 노션처럼 핸들을 누르면 그 블록이 "선택"돼요 — 메뉴를 Esc로 닫아도 선택은 남아서, 이어서
              // Shift+↑/↓로 블록 여러 개를 고르거나 Backspace로 지울 수 있어요.
              setSelectedBlockIds(new Set([block.id]));
              selectionAnchorIdRef.current = block.id;
              selectionCursorRef.current = { anchor: block.id, focus: block.id };
              setBlockMenu((prev) =>
                prev?.blockId === block.id ? null : { blockId: block.id, mode: "main" },
              );
            }}
            isBulkMenuAnchor={bulkMenu?.anchorBlockId === block.id}
            bulkMenuMode={bulkMenu?.anchorBlockId === block.id ? bulkMenu.mode : "main"}
            bulkSelectedCount={selectedBlockIds.size}
            onBulkOpenColorView={() => setBulkMenu((prev) => (prev ? { ...prev, mode: "color" } : prev))}
            onBulkOpenTextColorView={() =>
              setBulkMenu((prev) => (prev ? { ...prev, mode: "textColor" } : prev))
            }
            onBulkOpenConvertView={() =>
              setBulkMenu((prev) => (prev ? { ...prev, mode: "convert" } : prev))
            }
            onBulkOpenMainView={() => setBulkMenu((prev) => (prev ? { ...prev, mode: "main" } : prev))}
            onBulkCloseMenu={() => setBulkMenu(null)}
            onBulkSetColor={(color) => bulkSetColor(color)}
            onBulkSetTextColor={(textColor) => bulkSetTextColor(textColor)}
            onBulkConvert={(type) => bulkConvert(type)}
            onBulkDuplicate={() => bulkDuplicateSelected()}
            onBulkDelete={() => bulkDeleteSelected()}
            onOpenConvertView={() => setBlockMenu({ blockId: block.id, mode: "convert" })}
            onOpenColorView={() => setBlockMenu({ blockId: block.id, mode: "color" })}
            onOpenTextColorView={() => setBlockMenu({ blockId: block.id, mode: "textColor" })}
            onOpenMainView={() => setBlockMenu({ blockId: block.id, mode: "main" })}
            onCloseMore={() => setBlockMenu(null)}
            isCommentsOpen={commentPanel === block.id}
            onToggleComments={() =>
              setCommentPanel((prev) => (prev === block.id ? null : block.id))
            }
            onOpenComments={() => setCommentPanel(block.id)}
            onCloseComments={() => setCommentPanel(null)}
            onAddComment={(text) => addComment(block.id, text)}
            onEditComment={(commentId, text) => editComment(block.id, commentId, text)}
            onDeleteComment={(commentId) => deleteComment(block.id, commentId)}
            onDragHandleStart={() => {
              setDragBlockId(block.id);
              // 잡은 블록이 다중 선택(2개 이상)의 일부면 선택된 블록 전체를
              // 그룹으로, 아니면(선택 안 돼있거나 혼자 선택된 경우) 이 블록
              // 하나만 — 기존 단일-드래그 동작을 그대로 보존해요. 단일
              // 드래그일 땐 요청("상위 블록을 이동하면 하위 블록도 같이
              // 이동해")대로, 이 블록에 자식이 있으면(들여쓰기된 하위
              // 블록들) 그 자식들까지 한 덩어리에 넣어요 — commitBlockDrop은
              // draggedGroupIds 안의 블록들을 원래 상대 순서 그대로 통째로
              // 옮기니, 여기서 집합만 채우면 부모+자식이 같이 이동해요.
              setDraggedGroupIds(
                selectedBlockIds.size > 1 && selectedBlockIds.has(block.id)
                  ? expandSelectionWithSubtrees(blocks, selectedBlockIds) // 접힌 토글의 숨은 자식도 같이 움직여야 해요
                  : new Set(getSubtreeIds(blocks, blocks.findIndex((b) => b.id === block.id))),
              );
            }}
            onRowDragOver={(isAfter, wantsNested) =>
              handleBlockDragOver(block.id, isAfter, wantsNested)
            }
            // 드래그가 Esc로 취소됐거나 에디터 밖(사이드바 등)에 놓였으면(dropEffect === "none") 블록을
            // 옮기지 않고 표시선만 치워요. 에디터 위에서 놓였으면 onDrop이 이미 옮겼거나 여기서 옮겨요.
            onDragHandleEnd={(e) => {
              if (e?.dataTransfer?.dropEffect === "none") {
                setDragBlockId(null);
                setDraggedGroupIds(new Set());
                setBlockDropTarget(null);
                return;
              }
              commitBlockDrop();
            }}
            registerRef={(el) => {
              inputRefs.current[block.id] = el;
            }}
          />
    );
    return cloneElement(rawRow, stabilizeRowProps(block.id, rawRow.props));
  };

  const renderRange = (start, end, indentBase) => {
    const out = [];
    let i = start;
    while (i < end) {
      const block = blocks[i];
      if (hiddenBlockIds.has(block.id)) {
        i += 1;
        continue;
      }

      if (isContainerBlock(block)) {
        const subEnd = Math.min(getSubtreeRange(blocks, i), end);
        const ownIndent = block.indent || 0;
        const rel = ownIndent - indentBase;
        const boxBg =
          block.type === "CALLOUT" ? BLOCK_COLORS.find((c) => c.key === block.color)?.bg || null : null;
        out.push(
          <Fragment key={block.id}>
            {renderDropIndicator(block, indentBase)}
            <div
              className={`block-container block-container--${block.type.toLowerCase()}`}
              data-container-id={block.id}
              style={{
                ...(rel > 0 ? { marginLeft: `${rel * 24}px` } : {}),
                ...(boxBg ? { backgroundColor: boxBg } : {}),
              }}
            >
              {renderBlockRow(i, ownIndent)}
              {subEnd > i + 1 && (
                <div className="block-container__children">{renderRange(i + 1, subEnd, ownIndent + 1)}</div>
              )}
            </div>
          </Fragment>,
        );
        i = subEnd;
        continue;
      }

      const emptyToggle =
        block.type === "TOGGLE" &&
        !block.collapsed &&
        !((blocks[i + 1]?.indent || 0) > (block.indent || 0));
      out.push(
        <Fragment key={block.id}>
          {renderDropIndicator(block, indentBase)}
          {renderBlockRow(i, indentBase)}
          {emptyToggle && (
            <div
              className="block-toggle-empty"
              style={{ marginLeft: `${Math.max(0, (block.indent || 0) - indentBase) * 24}px` }}
              onClick={() => insertBlockAfter(block.id, "TEXT", { asChild: true })}
            >
              내용이 없어요. 클릭해서 추가하세요.
            </div>
          )}
        </Fragment>,
      );
      i += 1;
    }
    return out;
  };

  return (
    <div
      className="block-editor"
      ref={editorRef}
      onMouseDown={handleSelectionMouseDown}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();

        // 컴퓨터에서 이미지 파일을 바로 끌어다 놓은 경우(외부 드래그)는
        // dataTransfer.files가 채워져 있어요 — 블록 순서를 바꾸는 내부
        // 드래그(핸들로 시작)는 이게 없어서, files 유무로 둘을 갈라요.
        // files가 비어있어도 다른 브라우저 탭/웹페이지의 이미지를 끌어다
        // 놓은 경우일 수 있어서, 그땐 URL을 대신 꺼내요.
        const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0;
        const externalUrl = hasFiles ? null : extractDroppedImageUrl(e.dataTransfer);

        if (hasFiles || externalUrl) {
          const anchor = resolveDropAnchor(e);
          if (hasFiles) insertImageBlocksFromFiles(e.dataTransfer.files, anchor);
          else insertImageBlockFromUrl(externalUrl, anchor);

          setDragBlockId(null);
          setDraggedGroupIds(new Set());
          setBlockDropTarget(null);
          return;
        }

        // dragend가 어떤 이유로든 블록까지 안 오는 극단적인 경우를
        // 대비한 보험(칸반 보드 레벨의 onDrop과 같은 패턴) — 이미
        // 커밋됐으면 commitBlockDrop 안에서 조용히 무시돼요.
        commitBlockDrop();
      }}
    >
      {renderRange(0, blocks.length, 0)}

      {blockDropTarget?.beforeBlockId === null && (
        <div className="block-drop-indicator" />
      )}

      <div
        className="block-editor__empty-area"
        onClick={handleEmptyAreaClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          handleEditorEndDragEnter();
        }}
        aria-hidden="true"
      />

      {/* 드래그하는 동안만 보이는 사각형 — .block-editor(position:relative,
          아래 CSS)를 기준으로 좌표를 잡아요. pointer-events:none이라
          마우스 이벤트를 가로채지 않고 그 아래 블록에 그대로 전달돼요. */}
      {isBoxSelecting && selectionBox && (
        <div
          className="block-select-box"
          style={{
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      )}

      {/* 요청: "인라인 서식" — 텍스트 선택 위에 뜨는 굵게/기울임/밑줄/
          취소선/인라인 코드/링크 툴바예요. .block-editor 안(React 트리
          기준 자손)에 둬야, 이 포털 버튼을 누를 때 나는 mousedown이
          handleSelectionMouseDown/handleOutsideMouseDown까지 리액트
          트리를 타고 올라가서 위 data-popover-portal 예외 처리를
          제대로 받아요(포털은 실제 DOM은 document.body 밑이지만, 리액트
          이벤트는 DOM이 아니라 리액트 트리를 따라 버블링해요). */}
      {selectionToolbar && (
        <SelectionToolbar
          rect={selectionToolbar.rect}
            sideRight={selectionToolbar.sideRight}
          marks={
            // 요청: "노션처럼 텍스트만 다중 선택 + 인라인 편집기" —
            // 블록 하나짜리 선택(지금까지와 같은, 훨씬 흔한 경우)은
            // execCommand 기반 getActiveMarks를 그대로 써요. 두 블록
            // 이상에 걸친 선택은 execCommand의 queryCommandState가
            // "지금 포커스된 그 블록"만 반영해서 못 믿으니, 선택과
            // 겹치는 블록 전체가 다 그 태그로 덮여 있는지를 직접
            // 확인하는 isMarkActiveAcrossBlocks로 대신해요.
            selectionToolbar.blocks.length === 1
              ? getActiveMarks(selectionToolbar.blocks[0].rootEl)
              : {
                  bold: isMarkActiveAcrossBlocks("b", selectionToolbar.blocks),
                  italic: isMarkActiveAcrossBlocks("i", selectionToolbar.blocks),
                  underline: isMarkActiveAcrossBlocks("u", selectionToolbar.blocks),
                  strike: isMarkActiveAcrossBlocks("s", selectionToolbar.blocks),
                  code: isMarkActiveAcrossBlocks("code", selectionToolbar.blocks),
                  link: isMarkActiveAcrossBlocks("a", selectionToolbar.blocks),
                }
          }
          turnInto={
            selectionToolbar.blocks.length === 1
              ? (() => {
                  const target = blocks.find((b) => b.id === selectionToolbar.blocks[0].blockId);
                  if (!target || !RICH_TEXT_TYPES.includes(target.type) || target.pageId) return null;
                  const options = blockTypeOptions.filter((o) =>
                    ["TEXT", "H1", "H2", "H3", "TODO", "BULLET", "NUMBERED", "TOGGLE", "QUOTE", "CALLOUT", "CODE"].includes(o.type),
                  );
                  return {
                    currentType: target.type,
                    currentLabel: blockTypeOptions.find((o) => o.type === target.type)?.label || "텍스트",
                    options,
                    onSelect: (type) => {
                      if (type === target.type) return;
                      window.getSelection()?.removeAllRanges();
                      convertBlock(target.id, type);
                    },
                  };
                })()
              : null
          }
          colors={{
            text: BLOCK_TEXT_COLORS,
            bg: BLOCK_COLORS,
            onApply: (attr, key) => applyInlineColor(selectionToolbar.blocks, attr, key),
          }}
          onToggle={(mark) => {
            if (selectionToolbar.blocks.length === 1) {
              const rootEl = selectionToolbar.blocks[0].rootEl;
              if (mark === "bold") toggleBold();
              else if (mark === "italic") toggleItalic();
              else if (mark === "underline") toggleUnderline();
              else if (mark === "strike") toggleStrike();
              else if (mark === "code") toggleInlineCode(rootEl);
            } else {
              const tag = { bold: "b", italic: "i", underline: "u", strike: "s", code: "code" }[mark];
              if (tag) applyMarkAcrossBlocks(tag, selectionToolbar.blocks);
            }
            // 토글 직후 버튼의 active 표시가 바로 반영되게 한 번 더
            // 리렌더를 트리거해요(marks는 위에서 그때그때 다시
            // 계산돼요) — selectionchange도 뒤따라 오긴 하지만,
            // 브라우저마다 타이밍이 다를 수 있어 직접 한 번 더 챙겨요.
            // 여러 블록 버전(applyMarkAcrossBlocks)은 끝나면 네이티브
            // 선택 자체를 지워서(블록 경계를 넘나드는 Range를 계속
            // 들고 있는 게 더 불안정해요) 다음 selectionchange가 와도
            // 곧 툴바가 사라지니, 그 전에 한 번은 active 표시가 바뀐
            // 채로 보이게 여기서 상태를 유지해요.
            setSelectionToolbar((s) => (s ? { ...s } : s));
          }}
          onLink={() => {
            if (selectionToolbar.blocks.length === 1) {
              toggleLink(selectionToolbar.blocks[0].rootEl, () => openLinkPopover(selectionToolbar.blocks));
            } else {
              const alreadyLinked = isMarkActiveAcrossBlocks("a", selectionToolbar.blocks);
              if (alreadyLinked) {
                applyMarkAcrossBlocks("a", selectionToolbar.blocks, { mode: "off" });
              } else {
                openLinkPopover(selectionToolbar.blocks);
              }
            }
            setSelectionToolbar((s) => (s ? { ...s } : s));
          }}
        />
      )}

      {linkPopover && <LinkPopover rect={linkPopover.rect} onSubmit={submitLink} onCancel={cancelLink} />}
    </div>
  );
}
