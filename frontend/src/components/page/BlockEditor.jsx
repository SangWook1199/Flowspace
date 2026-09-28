import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Type,
  Trash2,
  FileText,
  Heading1,
  Heading2,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code2,
  Image as ImageIcon,
  Table2,
  Database as DatabaseIcon,
  ListChecks,
  CalendarClock,
  File as FileIcon,
  Pause,
  Flag,
} from "lucide-react";

import DatabaseBlock from "./DatabaseBlock";
import SimpleTableBlock from "./SimpleTableBlock";
import { sprintTaskRows } from "../../mock/sprintTasks";
import { calendarEvents } from "../../mock/calendar";
import { sprints } from "../../mock/sprints";

// blocks.type ENUM(TEXT/H1/H2/TODO/BULLET/NUMBERED/QUOTE/TASK/EVENT/
// DATABASE/IMAGE/DIVIDER/CODE) 그대로. 노션에는 없는 TASK/EVENT가 있는
// 이유는 FlowSpace 페이지가 스프린트 태스크·캘린더 이벤트를 직접 가져와
// 보여줄 수 있게 하기 위해서예요 — 노션이었다면 이 정보는 페이지 밖의
// 다른 툴에 있었을 거예요.
//
// "하위 페이지"는 이 ENUM에 없어서 새 타입을 만들지 않았어요. 목록엔
// 슬래시/타입변경 메뉴에서 고를 수 있게 CHILD_PAGE라는 항목을 두지만,
// 이건 메뉴 전용 키일 뿐 실제로 블록에 저장되는 type은 항상 'TEXT'예요
// (content가 비어있고 pageId만 채워진 TEXT 블록 — TASK/EVENT가
// task_id/event_id 컬럼을 쓰듯, 실제 DB라면 이 pageId도 새 컬럼보다는
// content JSON(예: {"pageId": 4})에 넣으면 스키마 변경 없이 끝나요).
// aliases: 슬래시 메뉴에서 마우스 없이도 타입을 바로 지정할 수 있게, 자주
// 쓸 법한 영어/한글 키워드를 모아둔 목록이에요. "/h1", "/제목1"처럼 정확히
// 치고 Enter를 누르면 필터링된 목록 맨 위 항목이 바로 그 타입으로
// 적용돼요 — 노션·슬랙 등에서 흔한, 마우스 없이 끝까지 쓸 수 있는 방식.
const BLOCK_TYPES = [
  { type: "TEXT", label: "텍스트", icon: FileText, desc: "일반 텍스트로 작성", aliases: ["text", "텍스트", "p", "paragraph"] },
  { type: "H1", label: "제목 1", icon: Heading1, desc: "큰 섹션 제목", aliases: ["h1", "제목1", "heading1", "title1"] },
  { type: "H2", label: "제목 2", icon: Heading2, desc: "보통 섹션 제목", aliases: ["h2", "제목2", "heading2", "title2"] },
  { type: "TODO", label: "할 일", icon: CheckSquare, desc: "체크박스가 있는 할 일", aliases: ["todo", "할일", "체크박스", "checkbox", "check"] },
  { type: "BULLET", label: "글머리 기호", icon: List, desc: "글머리 기호 목록 만들기", aliases: ["bullet", "글머리", "목록", "list", "ul"] },
  { type: "NUMBERED", label: "번호 매기기", icon: ListOrdered, desc: "번호가 매겨진 목록", aliases: ["numbered", "번호", "순서", "ol", "number"] },
  { type: "QUOTE", label: "인용", icon: Quote, desc: "인용구 만들기", aliases: ["quote", "인용", "인용구"] },
  // "표"와 "데이터베이스"는 노션에서도 서로 다른 블록이라 메뉴도 둘로
  // 나눴어요 — 표는 컬럼 타입도 없는 그냥 텍스트 그리드(SimpleTableBlock),
  // 데이터베이스는 속성 타입·SELECT 옵션 색·행=페이지까지 있는 쪽
  // (DatabaseBlock). DDL엔 blocks.type ENUM에 TABLE이 따로 없어서, 실제
  // 저장되는 block.type은 둘 다 여전히 'DATABASE'예요 — 하위 페이지가
  // 메뉴 키(CHILD_PAGE)와 저장 타입(TEXT)이 달랐던 것과 같은 방식으로,
  // 여기 'TABLE'도 메뉴 전용 키고 block.database.kind 필드로만 둘을
  // 구분해요(스키마 변경 없음).
  { type: "TABLE", label: "표", icon: Table2, desc: "간단한 텍스트 표 만들기", aliases: ["table", "표"] },
  { type: "DATABASE", label: "데이터베이스", icon: DatabaseIcon, desc: "속성 타입이 있는 데이터베이스 만들기", aliases: ["database", "db", "데이터베이스"] },
  { type: "TASK", label: "태스크 연결", icon: ListChecks, desc: "스프린트 태스크를 가져오기", aliases: ["task", "태스크", "할일연결"] },
  { type: "EVENT", label: "이벤트 연결", icon: CalendarClock, desc: "캘린더 이벤트를 가져오기", aliases: ["event", "이벤트", "캘린더", "calendar"] },
  // TASK/EVENT와 같은 맥락의, FlowSpace만의 블록이에요. 스프린트 하나를
  // 통째로 연결해서 진행률·기간·상태를 페이지 안에서 실시간으로 보여줘요
  // (노션엔 "스프린트"라는 개념 자체가 없어서 이런 블록도 없어요). 클릭하면
  // 그 스프린트 상세 화면(/sprints/:id)으로 이동해요.
  { type: "SPRINT", label: "스프린트 연결", icon: Flag, desc: "스프린트 진행 현황을 가져오기", aliases: ["sprint", "스프린트", "진행률"] },
  { type: "CHILD_PAGE", label: "하위 페이지", icon: FileIcon, desc: "새 하위 페이지 만들기", aliases: ["page", "페이지", "childpage", "하위페이지", "subpage"] },
  { type: "DIVIDER", label: "구분선", icon: Minus, desc: "시각적으로 섹션 구분", aliases: ["divider", "구분선", "hr", "line"] },
  { type: "CODE", label: "코드", icon: Code2, desc: "코드 스니펫 작성", aliases: ["code", "코드"] },
  { type: "IMAGE", label: "이미지", icon: ImageIcon, desc: "이미지 업로드", aliases: ["image", "이미지", "img", "picture"] },
];

// 라벨에 있는 공백("제목 1")까지 정확히 안 쳐도(/제목1) 매칭되도록 공백을
// 지우고 비교해요. exact match(1순위) > startsWith(2순위) > includes(3순위)
// 순으로 점수를 매겨서, "/h1"을 치면 항상 제목 1이 맨 위로 와요.
function normalizeQuery(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

function filterBlockTypes(options, query) {
  const q = normalizeQuery(query);
  if (!q) return options;

  return options
    .map((item) => {
      const candidates = [item.label, item.type, ...(item.aliases || [])].map(normalizeQuery);
      let score = -1;
      candidates.forEach((c) => {
        if (c === q) score = Math.max(score, 3);
        else if (c.startsWith(q)) score = Math.max(score, 2);
        else if (c.includes(q)) score = Math.max(score, 1);
      });
      return { item, score };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

const MULTILINE_TYPES = ["TEXT", "CODE", "QUOTE"];
const LIST_TYPES = ["BULLET", "NUMBERED", "TODO"];

const PRIORITY_CLASS = { 높음: "high", 보통: "medium", 낮음: "low" };
const EVENT_COLOR_CLASS = {
  RED: "red",
  ORANGE: "orange",
  GREEN: "green",
  BLUE: "blue",
  PURPLE: "purple",
};

export default function BlockEditor({
  blocks: initialBlocks,
  onChange,
  pages = [],
  onCreateChildPage,
  onRenameRowPage,
  onDeleteRowPage,
}) {
  // pages/{pageId}/blocks API로 교체 예정. onChange가 있으면 상위(페이지 목록
  // 상태)로 변경 사항을 올려서 다른 화면에서도 최신 블록이 보이게 해요.
  const [blocks, setBlocksState] = useState(initialBlocks);
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, query }
  const [slashIndex, setSlashIndex] = useState(0); // 슬래시 메뉴에서 키보드로 고른 항목
  const [blockMenu, setBlockMenu] = useState(null); // { blockId, mode: "main" | "convert" }
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

  const inputRefs = useRef({});
  const idCounter = useRef(Math.max(0, ...initialBlocks.map((b) => b.id)) + 1);

  // PAGE 블록은 pageId만 들고 있고, 제목·아이콘은 항상 최신 pages 상태에서
  // 찾아 그려요 — 하위 페이지 제목을 바꿔도 부모 쪽 블록이 따로 갱신될
  // 필요가 없게.
  const pagesById = Object.fromEntries(pages.map((p) => [p.id, p]));

  // 하위 페이지를 만들 수 없는 컨텍스트(onCreateChildPage 미전달)에서는
  // "하위 페이지" 메뉴 항목 자체를 숨겨요.
  const blockTypeOptions = onCreateChildPage
    ? BLOCK_TYPES
    : BLOCK_TYPES.filter((item) => item.type !== "CHILD_PAGE");

  const setBlocks = (updater) => {
    setBlocksState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onChange?.(next);
      return next;
    });
  };

  const nextId = () => idCounter.current++;

  const focusBlock = (id) => {
    requestAnimationFrame(() => {
      const el = inputRefs.current[id];
      if (!el) return;
      el.focus();
      if (typeof el.setSelectionRange === "function") {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const insertBlockAfter = (id, type = "TEXT") => {
    const newId = nextId();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const next = [...prev];
      next.splice(index + 1, 0, createEmptyBlock(newId, type, onCreateChildPage));
      return next;
    });

    focusBlock(newId);
  };

  const addBlockAtEnd = (type = "TEXT") => {
    const newId = nextId();
    setBlocks((prev) => [...prev, createEmptyBlock(newId, type, onCreateChildPage)]);
    focusBlock(newId);
  };

  // 블록이 소유한 하위 페이지가 있으면(getOwnedPageIds) 확인을 받고
  // DatabaseBlock.deleteRow와 같은 방식으로 onDeleteRowPage(=
  // MainLayout의 deletePage, 하위 페이지까지 재귀적으로 같이 지움)를
  // 호출해요. 소유한 페이지가 없으면 그냥 true(진행해도 됨). 사용자가
  // 확인 창에서 취소하면 false를 돌려줘서, 호출한 쪽(deleteBlock/
  // convertBlock)이 나머지 작업을 멈추게 해요.
  const deleteOwnedPages = (block, confirmMessage) => {
    const ownedPageIds = getOwnedPageIds(block);
    if (ownedPageIds.length === 0) return true;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return false;

    ownedPageIds.forEach((pageId) => onDeleteRowPage?.(pageId));
    return true;
  };

  const deleteBlock = (id) => {
    const target = blocks.find((b) => b.id === id);
    if (!deleteOwnedPages(target, "이 블록을 지우면 연결된 하위 페이지도 함께 삭제돼요. 계속할까요?")) {
      return;
    }

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1 || prev.length === 1) return prev;

      const next = prev.filter((b) => b.id !== id);
      const nextFocus = next[Math.max(0, index - 1)];
      if (nextFocus) focusBlock(nextFocus.id);

      return next;
    });
    setBlockMenu(null);
  };

  const moveBlock = (id, direction) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setBlockMenu(null);
  };

  // 호버 중인 블록(hoveredBlockId) 위에서 커서가 그 블록 높이의 2/3
  // 지점을 넘었는지(isAfter)에 따라 "이 블록 앞"/"이 블록 뒤"를
  // 계산해요. 드래그 중인 블록 바로 앞 블록을 2/3 지점 넘어서 호버하면
  // "다음 블록"이 드래그 중인 블록 자기 자신이 되는 경우(=자기 자신
  // 앞에 넣기, 의미 없는 목표)가 있는데 — 칸반 카드 드래그에서 겪었던
  // 것과 같은 버그라, 아래 인덱스 비교보다 먼저 걸러요.
  const handleBlockDragOver = (hoveredBlockId, isAfter) => {
    if (dragBlockId === null || dragBlockId === hoveredBlockId) return;

    const hoveredIndex = blocks.findIndex((b) => b.id === hoveredBlockId);
    const nextBlock = isAfter ? blocks[hoveredIndex + 1] : null;
    const beforeBlockId = isAfter ? (nextBlock ? nextBlock.id : null) : hoveredBlockId;

    if (beforeBlockId === dragBlockId) {
      setBlockDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 실제로 순서가 안 바뀌는 자리(지금 있는 자리 그대로)면 줄을 숨겨요.
    const fromIndex = blocks.findIndex((b) => b.id === dragBlockId);
    if (beforeBlockId === null) {
      if (fromIndex === blocks.length - 1) {
        setBlockDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    } else {
      const targetIndex = blocks.findIndex((b) => b.id === beforeBlockId);
      if (targetIndex === fromIndex + 1) {
        setBlockDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setBlockDropTarget((prev) =>
      prev && prev.beforeBlockId === beforeBlockId ? prev : { beforeBlockId },
    );
  };

  // 맨 마지막 블록 아래의 빈 공간(block-editor__empty-area, 원래도 있던
  // "클릭하면 이어 쓰기" 영역)에 들어오면 "맨 끝으로" 처리해요. 블록
  // 사이에는 칸반과 달리 gap이 없어서(.block-editor에 gap 없음) 별도의
  // 전용 end-zone을 새로 만들 필요 없이 이 기존 빈 영역을 그대로 써요.
  const handleEditorEndDragEnter = () => {
    if (dragBlockId === null) return;

    const fromIndex = blocks.findIndex((b) => b.id === dragBlockId);
    if (fromIndex === blocks.length - 1) {
      setBlockDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    setBlockDropTarget((prev) =>
      prev && prev.beforeBlockId === null ? prev : { beforeBlockId: null },
    );
  };

  // 실제 배열 반영은 여기서 딱 한 번(드롭할 때).
  const commitBlockDrop = () => {
    if (dragBlockId !== null && blockDropTarget) {
      setBlocks((prev) => {
        const next = [...prev];
        const fromIndex = next.findIndex((b) => b.id === dragBlockId);
        if (fromIndex === -1) return prev;

        const [moved] = next.splice(fromIndex, 1);

        if (blockDropTarget.beforeBlockId === null) {
          next.push(moved);
        } else {
          const toIndex = next.findIndex((b) => b.id === blockDropTarget.beforeBlockId);
          if (toIndex === -1) {
            next.push(moved);
          } else {
            next.splice(toIndex, 0, moved);
          }
        }

        return next;
      });
    }

    setDragBlockId(null);
    setBlockDropTarget(null);
  };

  const convertBlock = (id, type) => {
    // 타입을 바꾸면 이 블록이 지금 갖고 있던 pageId/database.rows의
    // 페이지 연결은 항상 버려져요(아래 각 분기가 pageId: null이나
    // 새 database로 덮어씀) — 그대로 두면 deleteBlock과 똑같이 고아
    // 페이지가 생겨서, 같은 확인+cascade delete를 여기서도 해요.
    const current = blocks.find((b) => b.id === id);
    const confirmMessage = "타입을 바꾸면 이 블록에 연결된 하위 페이지도 함께 삭제돼요. 계속할까요?";

    if (type === "CHILD_PAGE") {
      // 새 하위 페이지를 바로 만들고, 이 블록을 그 페이지로 가는
      // 링크로 바꿔요. (현재 페이지에는 그대로 머무름 — 슬래시 명령
      // 중에 갑자기 다른 페이지로 튕기면 어색하니까) 저장되는 type은
      // 여전히 'TEXT'예요 — pageId가 있으면 렌더링만 링크로 바뀌어요.
      // newPage부터 만들어서 실패(onCreateChildPage 미전달 등) 시엔
      // 기존 페이지를 지우기 전에 그냥 빠져나가게 해요.
      const newPage = onCreateChildPage?.();
      if (!newPage) return;
      if (!deleteOwnedPages(current, confirmMessage)) return;
      updateBlock(id, { type: "TEXT", content: "", pageId: newPage.id });
      setSlashMenu(null);
      setBlockMenu(null);
      return;
    }

    if (type === "TABLE") {
      // "표"도 CHILD_PAGE와 같은 패턴이에요 — DDL엔 TABLE이라는 blocks.type이
      // 없어서, 실제로 저장되는 type은 여전히 'DATABASE'고 database.kind로만
      // "표"(단순 텍스트 그리드)인지 "데이터베이스"(속성 타입)인지 갈라요.
      if (!deleteOwnedPages(current, confirmMessage)) return;
      updateBlock(id, { type: "DATABASE", content: "", pageId: null, database: createSimpleTable() });
      setSlashMenu(null);
      setBlockMenu(null);
      return;
    }

    if (!deleteOwnedPages(current, confirmMessage)) return;
    updateBlock(id, {
      type,
      content: "",
      pageId: null, // 이전에 하위 페이지 링크였을 수도 있으니 항상 초기화
      ...(type === "TODO" ? { checked: false } : {}),
      ...(type === "IMAGE" ? { image: null } : {}),
      ...(type === "DATABASE" ? { database: createDefaultDatabase(onCreateChildPage) } : {}),
      ...(type === "TASK" ? { task: null } : {}),
      ...(type === "EVENT" ? { event: null } : {}),
      ...(type === "SPRINT" ? { sprint: null } : {}),
    });
    setSlashMenu(null);
    setBlockMenu(null);
    focusBlock(id);
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
    const isEmptyWritable = last && last.type === "TEXT" && last.content === "" && !last.pageId;
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
    const wasEmpty = block.content === "";
    const isSlashActive = slashMenu?.blockId === block.id;

    if (value.startsWith("/") && (wasEmpty || isSlashActive)) {
      setSlashMenu({ blockId: block.id, query: value.slice(1) });
      setSlashIndex(0);
    } else if (isSlashActive) {
      setSlashMenu(null);
    }

    updateBlock(block.id, { content: value });
  };

  const handleKeyDown = (e, block) => {
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
        e.preventDefault();
        setSlashMenu(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && block.type !== "CODE") {
      e.preventDefault();

      if (LIST_TYPES.includes(block.type) && block.content.trim() === "") {
        updateBlock(block.id, { type: "TEXT" });
        return;
      }

      const continueType = LIST_TYPES.includes(block.type) ? block.type : "TEXT";
      insertBlockAfter(block.id, continueType);
      return;
    }

    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
      return;
    }
  };

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

  const numbers = computeNumbers(blocks);

  return (
    <div
      className="block-editor"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        // dragend가 어떤 이유로든 블록까지 안 오는 극단적인 경우를
        // 대비한 보험(칸반 보드 레벨의 onDrop과 같은 패턴) — 이미
        // 커밋됐으면 commitBlockDrop 안에서 조용히 무시돼요.
        e.preventDefault();
        commitBlockDrop();
      }}
    >
      {blockMenu && (
        <div className="block-menu-overlay" onClick={() => setBlockMenu(null)} />
      )}

      {blocks.map((block, index) => (
        <Fragment key={block.id}>
          {blockDropTarget?.beforeBlockId === block.id && (
            <div className="block-drop-indicator" />
          )}

          <BlockRow
            block={block}
            number={numbers[index]}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            isFocused={focusedBlockId === block.id}
            isDragging={dragBlockId === block.id}
            pageLink={block.pageId ? pagesById[block.pageId] : null}
            pages={pages}
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
            onFocus={() => handleFocus(block)}
            onBlur={() => handleBlur(block)}
            onToggleCheck={() => updateBlock(block.id, { checked: !block.checked })}
            onImageSelect={(file) => handleImageSelect(block, file)}
            onDatabaseChange={(database) => updateBlock(block.id, { database })}
            onRenameRowPage={onRenameRowPage}
            onDeleteRowPage={onDeleteRowPage}
            onTaskChange={(task) => updateBlock(block.id, { task })}
            onEventChange={(event) => updateBlock(block.id, { event })}
            onSprintChange={(sprint) => updateBlock(block.id, { sprint })}
            onConvert={(type) => convertBlock(block.id, type)}
            onAddBelow={() => {
              insertBlockAfter(block.id);
              setBlockMenu(null);
            }}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, "up")}
            onMoveDown={() => moveBlock(block.id, "down")}
            onToggleMore={() =>
              setBlockMenu((prev) =>
                prev?.blockId === block.id ? null : { blockId: block.id, mode: "main" },
              )
            }
            onOpenConvertView={() => setBlockMenu({ blockId: block.id, mode: "convert" })}
            onOpenMainView={() => setBlockMenu({ blockId: block.id, mode: "main" })}
            onDragHandleStart={() => setDragBlockId(block.id)}
            onRowDragOver={(isAfter) => handleBlockDragOver(block.id, isAfter)}
            onDragHandleEnd={commitBlockDrop}
            registerRef={(el) => {
              inputRefs.current[block.id] = el;
            }}
          />
        </Fragment>
      ))}

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
    </div>
  );
}

/* ================= BlockRow ================= */

function BlockRow({
  block,
  number,
  isFirst,
  isLast,
  isFocused,
  isDragging = false,
  pageLink,
  pages,
  onCreateChildPage,
  blockTypeOptions,
  isSlashOpen,
  slashQuery,
  slashIndex,
  onSlashHover,
  isMoreOpen,
  moreMode,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onToggleCheck,
  onImageSelect,
  onDatabaseChange,
  onRenameRowPage,
  onDeleteRowPage,
  onTaskChange,
  onEventChange,
  onSprintChange,
  onConvert,
  onAddBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleMore,
  onOpenConvertView,
  onOpenMainView,
  onDragHandleStart,
  onRowDragOver,
  onDragHandleEnd,
  registerRef,
}) {
  const isMultiline = MULTILINE_TYPES.includes(block.type);
  const checkedClass = block.type === "TODO" && block.checked ? "checked" : "";
  const isEmbed =
    block.type === "DATABASE" || block.type === "TASK" || block.type === "EVENT" || block.type === "SPRINT";
  const rowRef = useRef(null);
  // TASK/EVENT/SPRINT 블록이 실제 데이터에 연결돼 있으면(아직 선택 전인
  // 빈 피커 상태가 아니면) 핸들에 작은 초록 점을 같이 보여줘요 — "살아있는
  // 블록"이라는 FlowSpace만의 개념을 핸들 자리에서부터 드러내는 신호예요.
  const isLive =
    (block.type === "TASK" && !!block.task) ||
    (block.type === "EVENT" && !!block.event) ||
    (block.type === "SPRINT" && !!block.sprint);
  // 핸들을 클릭해서 메뉴로 수정 중이거나(isMoreOpen), 잡고 끌어서
  // 위치를 옮기는 중이면(isDragging) 핸들 색을 꽉 채워서 "지금 이
  // 핸들이 뭔가를 하고 있다"는 게 호버 여부와 상관없이 계속 보이게
  // 해요.
  const isHandleActive = isMoreOpen || isDragging;

  return (
    <div
      ref={rowRef}
      className={`block-row block-${block.type.toLowerCase()} ${isMoreOpen ? "menu-open" : ""} ${
        isEmbed ? "block-row--embed" : ""
      } ${isDragging ? "dragging" : ""}`}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        onRowDragOver?.(ratio >= 2 / 3);
      }}
      onDrop={(e) => e.preventDefault()}
    >
      {/* 노션처럼 "+"와 드래그 핸들을 왼쪽에 나란히 둬요(호버할 때만
          보임). "+"는 바로 아래에 빈 블록을 추가하고, 핸들은 두 가지
          역할을 함께 해요 — 잡고 끌면 순서를 바꾸고(다른 블록 위로
          올라갈 때마다 그 블록의 2/3 지점을 기준으로 앞/뒤 위치가
          정해짐 — 위 onDragOver, 실제 배열 반영은 드롭할 때 한 번만.
          칸반 카드/컬럼 드래그와 같은 방식), 그냥 클릭하면(드래그 없이)
          블록 옵션 메뉴가 열려요. 노션은 점 6개(⋮⋮) 아이콘을 쓰는데,
          저희는 그 대신 두 개의 세로 막대(Pause 모양) 아이콘을 써서
          모양만으로도 노션과 다르게 보이게 했어요 — 폭이 늘었다 줄었다
          하는 모션은 옆 블록을 밀어내는 문제가 있어서 빼고, 크기는
          처음부터 고정했고(노션 정도 크기로) 태스크/이벤트/스프린트처럼
          실제 데이터에 연결된 블록은 핸들 위에 초록 점도 같이 떠서
          (isLive), 이 자리가 단순 이동 버튼이 아니라 "연결 상태를
          보여주는 자리"라는 의미를 더해요. 메뉴가 열려있거나(isMoreOpen)
          드래그 중이면(isDragging) 핸들이 "active" 클래스를 받아서 호버
          여부와 상관없이 색이 꽉 채워진 상태로 유지돼요. */}
      <div className="block-left-actions">
        <button
          type="button"
          className="block-add-btn"
          onClick={onAddBelow}
          title="아래에 블록 추가"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          className={`block-drag-handle ${isHandleActive ? "active" : ""}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            if (rowRef.current) {
              const rect = rowRef.current.getBoundingClientRect();
              e.dataTransfer.setDragImage(
                rowRef.current,
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
            }
            onDragHandleStart?.();
          }}
          onDragEnd={() => onDragHandleEnd?.()}
          onClick={onToggleMore}
          title="클릭: 블록 옵션 · 드래그: 순서 변경"
        >
          {/* lucide 아이콘은 기본이 선(stroke)만 그리는 아웃라인이라, 이대로
              두면 "두 세로 막대"가 속이 빈 테두리로만 보여요. fill을
              currentColor로 주고 stroke는 꺼서 막대 안쪽까지 색이 꽉 찬
              모양(요청하신 Dual Bars 레퍼런스)으로 보이게 했어요 — 이
              색은 핸들의 CSS color를 그대로 따라가서, 평소엔 회색, 호버·
              active일 땐 보라색으로 자동으로 같이 바뀌어요. */}
          <Pause size={16} fill="currentColor" stroke="none" />
          {isLive && <span className="block-drag-handle__dot" aria-hidden="true" />}
        </button>

        {isMoreOpen && (
          <div className="block-menu">
            {moreMode === "main" ? (
              <>
                <button type="button" onClick={onOpenConvertView}>
                  <Type size={14} />
                  <span>타입 변경</span>
                  <ChevronRight size={12} className="block-menu__chevron" />
                </button>

                <button type="button" onClick={onMoveUp} disabled={isFirst}>
                  <ArrowUp size={14} />
                  <span>위로 이동</span>
                </button>

                <button type="button" onClick={onMoveDown} disabled={isLast}>
                  <ArrowDown size={14} />
                  <span>아래로 이동</span>
                </button>

                <button type="button" onClick={onAddBelow}>
                  <Plus size={14} />
                  <span>아래에 블록 추가</span>
                </button>

                <hr className="block-menu__divider" />

                <button type="button" className="danger" onClick={onDelete}>
                  <Trash2 size={14} />
                  <span>삭제</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="block-menu__back" onClick={onOpenMainView}>
                  <ChevronLeft size={12} />
                  <span>뒤로</span>
                </button>

                {blockTypeOptions.map(({ type, label, icon: Icon }) => (
                  <button key={type} type="button" onClick={() => onConvert(type)}>
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="block-body">
        {block.type === "DIVIDER" ? (
          <hr className="block-divider-line" />
        ) : block.type === "IMAGE" ? (
          <BlockImage block={block} onImageSelect={onImageSelect} />
        ) : block.type === "DATABASE" ? (
          block.database?.kind === "TABLE" ? (
            <SimpleTableBlock table={block.database} onChange={onDatabaseChange} />
          ) : (
            <DatabaseBlock
              database={block.database}
              onChange={onDatabaseChange}
              pages={pages}
              onCreateRowPage={onCreateChildPage}
              onRenameRowPage={onRenameRowPage}
              onDeleteRowPage={onDeleteRowPage}
            />
          )
        ) : block.type === "TASK" ? (
          <TaskEmbed task={block.task} onChange={onTaskChange} />
        ) : block.type === "EVENT" ? (
          <EventEmbed event={block.event} onChange={onEventChange} />
        ) : block.type === "SPRINT" ? (
          <SprintEmbed sprint={block.sprint} onChange={onSprintChange} />
        ) : block.pageId ? (
          <PageLinkBlock page={pageLink} />
        ) : (
          <>
            {block.type === "TODO" && (
              <input
                type="checkbox"
                className="block-checkbox"
                checked={!!block.checked}
                onChange={onToggleCheck}
              />
            )}

            {block.type === "BULLET" && <span className="block-bullet">•</span>}

            {block.type === "NUMBERED" && <span className="block-number">{number}.</span>}

            {block.type === "QUOTE" && <span className="block-quote-bar" />}

            {isMultiline ? (
              <AutoTextarea
                innerRef={registerRef}
                className={`block-input block-input--${block.type.toLowerCase()} ${checkedClass}`}
                value={block.content}
                placeholder={isFocused ? placeholderFor(block.type) : ""}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            ) : (
              <input
                ref={registerRef}
                type="text"
                className={`block-input block-input--${block.type.toLowerCase()} ${checkedClass}`}
                value={block.content}
                placeholder={isFocused ? placeholderFor(block.type) : ""}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
              />
            )}
          </>
        )}

        {isSlashOpen && (
          <SlashMenu
            query={slashQuery}
            options={blockTypeOptions}
            activeIndex={slashIndex}
            onHoverIndex={onSlashHover}
            onSelect={onConvert}
          />
        )}
      </div>
    </div>
  );
}

/* ================= TaskEmbed / EventEmbed =================
   노션에는 없는, FlowSpace만의 블록. 스프린트 태스크·캘린더 이벤트를
   페이지 안에 그대로 가져와서 보여주고 클릭하면 실제 화면으로 이동해요. */

function TaskEmbed({ task, onChange }) {
  const navigate = useNavigate();

  if (!task) {
    return (
      <div className="embed-picker">
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = sprintTaskRows.find((t) => t.id === e.target.value);
            if (!picked) return;
            onChange({
              id: picked.id,
              title: picked.title,
              assignee: picked.assignee,
              priority: picked.priority,
              dueDate: picked.dueDate,
            });
          }}
        >
          <option value="" disabled>
            연결할 태스크를 선택하세요
          </option>
          {sprintTaskRows.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} · {t.title}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const priorityClass = PRIORITY_CLASS[task.priority] || "medium";

  return (
    <div className="embed-task-card">
      <button
        type="button"
        className="embed-task-card__link"
        onClick={() => navigate(`/sprints/1/tasks`)}
        title="태스크로 이동"
      >
        <span className={`embed-priority embed-priority--${priorityClass}`}>{task.priority}</span>
        <span className="embed-task-card__title">{task.title}</span>
        <span className="embed-task-card__meta">
          {/* 새로 피커로 연결한 태스크는 id 자체가 "SP1-1" 같은 코드
              문자열이라 그대로 쓰면 되는데, pages.js에 미리 심어둔 옛
              시드 데이터는 id(숫자)랑 code("SP1-08")가 따로 있어서
              task.id만 보여주면 그냥 "8"처럼 숫자만 떴어요. code가
              있으면 그걸 우선 써요. */}
          <span className="embed-task-card__code">{task.code ?? task.id}</span>
          <span className="embed-task-card__assignee">{task.assignee}</span>
          {task.dueDate && <span className="embed-task-card__due">~{task.dueDate}</span>}
        </span>
      </button>
    </div>
  );
}

function EventEmbed({ event, onChange }) {
  const navigate = useNavigate();

  if (!event) {
    return (
      <div className="embed-picker">
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = calendarEvents.find((ev) => String(ev.event_id) === e.target.value);
            if (!picked) return;
            onChange({
              id: picked.event_id,
              title: picked.title,
              start: picked.start_datetime,
              end: picked.end_datetime,
              color: picked.color,
            });
          }}
        >
          <option value="" disabled>
            연결할 이벤트를 선택하세요
          </option>
          {calendarEvents.map((ev) => (
            <option key={ev.event_id} value={ev.event_id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const colorClass = EVENT_COLOR_CLASS[event.color] || "blue";

  return (
    <div className={`embed-event-card embed-event-card--${colorClass}`}>
      <button
        type="button"
        className="embed-event-card__link"
        onClick={() => navigate("/calendar")}
        title="캘린더로 이동"
      >
        <span className="embed-event-card__bar" />
        <span className="embed-event-card__body">
          <strong>{event.title}</strong>
          <span>{formatEventRange(event.start, event.end)}</span>
        </span>
      </button>
    </div>
  );
}

/* ================= SprintEmbed =================
   TASK/EVENT와 마찬가지로 노션에는 없는, FlowSpace만의 블록이에요.
   개별 태스크나 이벤트 하나가 아니라 스프린트 자체를 연결해서, 그
   스프린트의 진행률·목표·기간을 페이지 안에서 실시간으로 보여줘요 —
   sprints 목(mock)의 progress/completed/total이 바뀌면 이 블록도 새로
   불러올 때마다 그대로 반영돼요(진짜 API가 붙으면 자동으로 최신
   상태가 돼요). 클릭하면 스프린트 상세 화면으로 이동해요. */

const SPRINT_STATUS_LABEL = {
  ACTIVE: "진행 중",
  PLANNING: "계획됨",
  COMPLETED: "완료",
};

function SprintEmbed({ sprint, onChange }) {
  const navigate = useNavigate();

  if (!sprint) {
    return (
      <div className="embed-picker">
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = sprints.find((s) => String(s.id) === e.target.value);
            if (!picked) return;
            onChange({
              id: picked.id,
              name: picked.name,
              goal: picked.goal,
              status: picked.status,
              remaining: picked.remaining,
              progress: picked.progress,
              completed: picked.completed,
              total: picked.total,
              color: picked.color,
            });
          }}
        >
          <option value="" disabled>
            연결할 스프린트를 선택하세요
          </option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.goal}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`embed-sprint-card embed-sprint-card--${sprint.color || "indigo"}`}>
      <button
        type="button"
        className="embed-sprint-card__link"
        onClick={() => navigate(`/sprints/${sprint.id}`)}
        title="스프린트로 이동"
      >
        <span className="embed-sprint-card__bar" />

        <span className="embed-sprint-card__body">
          <span className="embed-sprint-card__top">
            <strong>{sprint.name}</strong>
            <span className="embed-sprint-card__status">
              {SPRINT_STATUS_LABEL[sprint.status] || sprint.status}
            </span>
          </span>

          <span className="embed-sprint-card__goal">{sprint.goal}</span>

          <span className="embed-sprint-card__progress">
            <span className="embed-sprint-card__progress-track">
              <span style={{ width: `${sprint.progress}%` }} />
            </span>
            <span className="embed-sprint-card__progress-label">
              {sprint.completed}/{sprint.total} · {sprint.progress}%
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

/* ================= PageLinkBlock =================
   하위 페이지도 "블록"으로 문서 흐름 안에 있어야 노션처럼 느껴져서,
   페이지 맨 아래에 따로 박스를 두는 대신 다른 블록들과 같은 줄 높이의
   링크 블록으로 넣었어요. 제목·아이콘은 pages 상태에서 바로 읽어오니까
   하위 페이지 이름을 바꿔도 이 블록이 따로 갱신될 필요가 없어요. */

function PageLinkBlock({ page }) {
  const navigate = useNavigate();

  if (!page) {
    return <div className="page-link-block page-link-block--missing">삭제된 페이지예요</div>;
  }

  return (
    <button
      type="button"
      className="page-link-block"
      onClick={() => navigate(`/pages/${page.id}`)}
    >
      <span className="page-link-block__icon">{page.icon || <FileIcon size={14} />}</span>
      <span className="page-link-block__title">{page.title || "제목 없음"}</span>
    </button>
  );
}

/* ================= AutoTextarea ================= */

function AutoTextarea({
  innerRef,
  className,
  value,
  placeholder,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (innerRef) innerRef(el);
      }}
      className={className}
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

/* ================= BlockImage ================= */

function BlockImage({ block, onImageSelect }) {
  const fileRef = useRef(null);
  const image = block.image;

  if (image) {
    return (
      <div className="page-image-box">
        {image.url ? (
          <img src={image.url} alt={image.fileName} className="block-image-preview" />
        ) : (
          <div className="block-image-placeholder">
            <ImageIcon size={22} />
          </div>
        )}

        <div className="block-image-meta">
          <strong>{image.fileName}</strong>
          <span>{image.fileSize}</span>
        </div>

        <button type="button" className="block-image-replace" onClick={() => fileRef.current?.click()}>
          변경
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onImageSelect(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <button type="button" className="block-image-empty" onClick={() => fileRef.current?.click()}>
      <ImageIcon size={22} />
      <span>클릭해서 이미지 업로드</span>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onImageSelect(e.target.files?.[0])}
      />
    </button>
  );
}

/* ================= SlashMenu ================= */

function SlashMenu({ query, options, activeIndex, onHoverIndex, onSelect }) {
  const filtered = filterBlockTypes(options, query);

  if (filtered.length === 0) {
    return (
      <div className="block-slash-menu">
        <p className="block-slash-empty">일치하는 블록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="block-slash-menu">
      {filtered.map(({ type, label, icon: Icon, desc }, index) => (
        <button
          key={type}
          type="button"
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

/* ================= Util ================= */

// "/하위 페이지"나 "/데이터베이스"를 고르는 순간 실제 페이지가 만들어져서
// (CHILD_PAGE는 block.pageId, DATABASE는 그 안의 각 row.pageId) 이
// 블록이 "소유한" 페이지가 돼요. 이 블록을 지우거나 다른 타입으로
// 바꿀 때 그 페이지들을 안 같이 지우면, 어디서도 갈 수 없는 고아
// 페이지로 pages 배열에 계속 남아요 — deleteBlock/convertBlock에서
// 이 함수로 지울 대상을 모아서, DatabaseBlock의 deleteRow가 쓰는
// 것과 같은 cascade delete(onDeleteRowPage = MainLayout의 deletePage,
// 하위 페이지까지 재귀적으로 같이 지워줌)를 그대로 호출해요.
function getOwnedPageIds(block) {
  if (!block) return [];
  if (block.type === "TEXT" && block.pageId) return [block.pageId];
  if (block.type === "DATABASE" && block.database?.rows?.length) {
    return block.database.rows.filter((r) => r.pageId).map((r) => r.pageId);
  }
  return [];
}

function createEmptyBlock(id, type, onCreateRowPage) {
  if (type === "TODO") return { id, type, content: "", checked: false };
  if (type === "IMAGE") return { id, type, image: null };
  if (type === "DATABASE") return { id, type, database: createDefaultDatabase(onCreateRowPage) };
  if (type === "TABLE") return { id, type: "DATABASE", database: createSimpleTable() };
  if (type === "TASK") return { id, type, task: null };
  if (type === "EVENT") return { id, type, event: null };
  if (type === "SPRINT") return { id, type, sprint: null };
  return { id, type, content: "" };
}

// 데이터베이스는 노션처럼 columns[0]이 항상 TITLE 타입이고, 그 열이 곧
// "행 = 페이지"의 제목이에요(DatabaseBlock이 TITLE 열의 삭제·타입 변경을
// 막아요). 노션은 행을 만드는 순간 이미 페이지라서, 여기서도 시드 행을
// 만들 때 onCreateRowPage로 바로 페이지를 만들어 pageId를 채워요 — "아직
// 페이지가 없는 행"이라는 상태 자체가 없게.
function createDefaultDatabase(onCreateRowPage) {
  // 기본 속성을 노션처럼 이름(제목) · 생성 일시 · 사람 3개로 시작해요 —
  // 열 이름은 COLUMN_TYPES의 해당 유형 이름과 그대로 맞춰서(예:
  // CREATED_TIME → "생성 일시") "값"/"새 열" 같은 임시 이름이 남지
  // 않게 해요. 행은 1개만 시드로 만들어요 — "행 = 페이지"라서 행을
  // 늘리면 그만큼 숨은 하위 페이지가 같이 생기는데, /데이터베이스를
  // 칠 때마다 페이지가 여러 개 만들어지는 건 원치 않는다고 하셔서
  // 딱 1개(=페이지 1개)만 만들어요.
  const columns = [
    { id: 1, name: "이름", type: "TITLE" },
    { id: 2, name: "생성 일시", type: "CREATED_TIME" },
    { id: 3, name: "사람", type: "PERSON" },
  ];
  const seedPage = onCreateRowPage?.();
  return {
    kind: "DATABASE",
    title: "",
    columns,
    rows: [{ id: 1, pageId: seedPage?.id ?? null }],
    cells: [],
  };
}

// "표" — 데이터베이스와 달리 속성 타입이 아예 없는, 그냥 텍스트 칸으로만
// 이루어진 단순한 그리드예요(노션 기본 Table 블록과 동일한 수준). 제목도
// 없고, 컬럼도 이름만 있을 뿐 타입 선택이 없어요.
function createSimpleTable() {
  const columns = [
    { id: 1, name: "" },
    { id: 2, name: "" },
    { id: 3, name: "" },
  ];
  return {
    kind: "TABLE",
    columns,
    rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
    cells: [],
  };
}

function placeholderFor(type) {
  switch (type) {
    case "H1":
      return "제목 1";
    case "H2":
      return "제목 2";
    case "TODO":
      return "할 일을 입력하세요";
    case "BULLET":
    case "NUMBERED":
      return "목록 항목";
    case "QUOTE":
      return "인용구를 입력하세요";
    case "CODE":
      return "코드를 입력하세요";
    default:
      return "내용을 입력하거나 '/'로 블록 추가...";
  }
}

function computeNumbers(blocks) {
  const numbers = [];
  let counter = 0;

  blocks.forEach((block) => {
    if (block.type === "NUMBERED") {
      counter += 1;
    } else {
      counter = 0;
    }
    numbers.push(counter);
  });

  return numbers;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatEventRange(start, end) {
  const fmt = (iso) => {
    if (!iso) return "";
    const [date, time] = iso.split("T");
    const [, m, d] = date.split("-");
    return time ? `${m}.${d} ${time}` : `${m}.${d}`;
  };
  const s = fmt(start);
  const e = fmt(end);
  return e ? `${s} ~ ${e}` : s;
}
