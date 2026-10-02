import { BLOCK_TYPES, RICH_TEXT_TYPES } from "./blockTypes.js";
import { sanitizeInlineHtml, escapePlainTextToHtml } from "../RichTextInput";

const VALID_BLOCK_TYPES = new Set(BLOCK_TYPES.map((t) => t.type));

// 불러온 데이터나 붙여넣은 블록 JSON(바깥에서 온 값)을 믿고 쓰기 전에 모양을 바로잡아요:
//  - 객체가 아니면 버리고(null), 모르는 type이거나 type이 없으면 일반 텍스트(TEXT)로 바꿔요
//    (type이 없으면 화면을 그리다 에러가 나서 페이지가 하얗게 됐어요).
//  - 글자 블록의 content는 항상 문자열이고, 서식 HTML은 한 번 걸러서(허용된 태그만) 스크립트가 못 들어오게 해요.
//    예전 순수 글자 데이터(richText가 없는 것)는 이스케이프해서 HTML로 올려요.
//  - 들여쓰기는 0 이상의 정수만 남겨요.
export function normalizeBlockShape(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const type = VALID_BLOCK_TYPES.has(raw.type) ? raw.type : "TEXT";
  const b = { ...raw, type };
  const indent = Number(b.indent);
  if (Number.isFinite(indent) && indent > 0) b.indent = Math.min(Math.floor(indent), 12);
  else delete b.indent;
  if (RICH_TEXT_TYPES.includes(type)) {
    const text = typeof b.content === "string" ? b.content : b.content == null ? "" : String(b.content);
    b.content = b.richText ? sanitizeInlineHtml(text) : escapePlainTextToHtml(text);
    b.richText = true;
  } else if (type === "CODE" && typeof b.content !== "string") {
    b.content = b.content == null ? "" : String(b.content);
  }
  return b;
}

// "/하위 페이지"나 "/데이터베이스"를 고르는 순간 실제 페이지가 만들어져서
// (CHILD_PAGE는 block.pageId, DATABASE는 그 안의 각 row.pageId) 이
// 블록이 "소유한" 페이지가 돼요. 이 블록을 지우거나 다른 타입으로
// 바꿀 때 그 페이지들을 안 같이 지우면, 어디서도 갈 수 없는 고아
// 페이지로 pages 배열에 계속 남아요 — deleteBlock/convertBlock에서
// 이 함수로 지울 대상을 모아서, DatabaseBlock의 deleteRow가 쓰는
// 것과 같은 cascade delete(onDeleteRowPage = MainLayout의 deletePage,
// 하위 페이지까지 재귀적으로 같이 지워줌)를 그대로 호출해요.
export function getOwnedPageIds(block) {
  if (!block) return [];
  if (block.type === "TEXT" && block.pageId) return [block.pageId];
  if (block.type === "DATABASE" && block.database?.rows?.length) {
    return block.database.rows.filter((r) => r.pageId).map((r) => r.pageId);
  }
  return [];
}

export function createEmptyBlock(id, type, onCreateRowPage) {
  if (type === "TODO") return { id, type, content: "", checked: false };
  if (type === "IMAGE" || type === "FILE") return { id, type, image: null };
  if (type === "DATABASE") return { id, type, database: createDefaultDatabase(onCreateRowPage) };
  if (type === "TABLE") return { id, type: "DATABASE", database: createSimpleTable() };
  if (type === "TASK") return { id, type, taskId: null };
  if (type === "EVENT") return { id, type, eventId: null };
  if (type === "SPRINT") return { id, type, sprintId: null };
  // 요청: "블록 종류가 노션보다 적어요" — 토글은 항상 펼친 상태로
  // 시작해요(collapsed:false, 방금 만든 토글에 자식이 아직 하나도
  // 없으니 접혀 있어도 어차피 똑같아 보이지만, 데이터 형태는 처음부터
  // 명확히 해둬요). 콜아웃은 노션처럼 기본 아이콘(💡)과 옅은 회색
  // 배경으로 시작해요 — 배경색은 이미 있는 BLOCK_COLORS의 "gray"를
  // 그대로 재사용해서, 렌더링 쪽에 "콜아웃은 색이 없어도 항상 박스로
  // 보여야 한다" 같은 별도 예외 처리를 안 만들어도 돼요.
  if (type === "TOGGLE") return { id, type, content: "", collapsed: false };
  if (type === "CALLOUT") return { id, type, content: "", calloutIcon: "💡", color: "gray" };
  return { id, type, content: "" };
}

// 데이터베이스는 노션처럼 columns[0]이 항상 TITLE 타입이고, 그 열이 곧
// "행 = 페이지"의 제목이에요(DatabaseBlock이 TITLE 열의 삭제·타입 변경을
// 막아요). 노션은 행을 만드는 순간 이미 페이지라서, 여기서도 시드 행을
// 만들 때 onCreateRowPage로 바로 페이지를 만들어 pageId를 채워요 — "아직
// 페이지가 없는 행"이라는 상태 자체가 없게.
export function createDefaultDatabase(onCreateRowPage) {
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
export function createSimpleTable() {
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
