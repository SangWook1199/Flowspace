import { ChevronRight, FileText, Heading1, Heading2, Heading3, Lightbulb, CheckSquare, List, ListOrdered, Quote, Minus, Code2, Image as ImageIcon, Table2, Database as DatabaseIcon, ListChecks, CalendarClock, File as FileIcon, Paperclip, Flag } from "lucide-react";

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
export const BLOCK_TYPES = [
  { type: "TEXT", label: "텍스트", icon: FileText, desc: "일반 텍스트로 작성", aliases: ["text", "텍스트", "p", "paragraph"] },
  { type: "H1", label: "제목 1", icon: Heading1, desc: "큰 섹션 제목", aliases: ["h1", "제목1", "heading1", "title1"] },
  { type: "H2", label: "제목 2", icon: Heading2, desc: "보통 섹션 제목", aliases: ["h2", "제목2", "heading2", "title2"] },
  { type: "H3", label: "제목 3", icon: Heading3, desc: "작은 섹션 제목", aliases: ["h3", "제목3", "heading3", "title3"] },
  { type: "TODO", label: "할 일", icon: CheckSquare, desc: "체크박스가 있는 할 일", aliases: ["todo", "할일", "체크박스", "checkbox", "check"] },
  { type: "BULLET", label: "글머리 기호", icon: List, desc: "글머리 기호 목록 만들기", aliases: ["bullet", "글머리", "목록", "list", "ul"] },
  { type: "NUMBERED", label: "번호 매기기", icon: ListOrdered, desc: "번호가 매겨진 목록", aliases: ["numbered", "번호", "순서", "ol", "number"] },
  { type: "QUOTE", label: "인용", icon: Quote, desc: "인용구 만들기", aliases: ["quote", "인용", "인용구"] },
  // 요청: "블록 종류가 노션보다 적어요" — 토글 목록은 노션에서 가장 많이
  // 쓰이는 블록 중 하나인데, 신기하게도 우리가 이미 만들어둔 들여쓰기
  // 모델(block.indent, getSubtreeRange)과 완벽히 들어맞아요 — "자식"은
  // 이미 "바로 뒤에 이어지는, indent가 더 큰 블록들"로 정의돼 있으니,
  // 토글은 그냥 collapsed 필드 하나만 더 들고 있으면 돼요(접혔을 때
  // 그 범위를 렌더링에서만 숨기면 끝 — 아래 computeHiddenBlockIds 참고).
  { type: "TOGGLE", label: "토글 목록", icon: ChevronRight, desc: "클릭하면 펼쳐지는 접이식 목록", aliases: ["toggle", "토글", "접기", "collapse", "펼치기"] },
  // 아이콘(이모지) + 배경색으로 강조하는 박스예요. 배경색은 이미 있는
  // block.color/BLOCK_COLORS 팔레트를 그대로 재사용해요(콜아웃 전용
  // 색상 시스템을 새로 안 만들어도, 핸들 메뉴의 색상 고르기가 그대로
  // 통해요) — 기본값만 "회색 배경"으로 미리 채워서(아래 createEmptyBlock)
  // 노션처럼 처음부터 옅은 박스로 보이게 해요.
  { type: "CALLOUT", label: "콜아웃", icon: Lightbulb, desc: "아이콘과 배경으로 강조하는 박스", aliases: ["callout", "콜아웃", "강조", "박스"] },
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
  // 노션의 "/file"과 같은 자리예요 — 업로드하거나 링크로 임베드한 파일을
  // 아이콘+파일명+용량 한 줄 카드로 보여줘요(아래 BlockFile). 이미지
  // 블록과 데이터 모양(block.image)을 그대로 공유해서, 핸들 메뉴의
  // "파일로 변경"/"이미지로 변경"(swapImageFileType)으로 서로 바뀌어도
  // 첨부 자체는 안 지워져요.
  { type: "FILE", label: "파일", icon: Paperclip, desc: "파일을 업로드하거나 링크로 임베드", aliases: ["file", "파일", "attachment", "첨부", "업로드"] },
];

// 노션의 블록 배경색 팔레트를 그대로 참고했어요(파스텔 9색 + 기본).
// key가 null이면 "기본"(배경 없음) — block.color가 없거나 null이면
// 이 항목이 적용돼요. bg는 .block-row에 인라인 style로 직접 칠하고,
// swatch는 색상 고르는 메뉴에서 동그란 미리보기로만 써요(그 메뉴
// 버튼 자체의 hover 배경은 다른 모든 블록 메뉴와 같은 톤을 써야 해서
// bg를 그대로 쓰지 않아요).
export const BLOCK_COLORS = [
  { key: null, label: "기본", swatch: "#ffffff" },
  { key: "gray", label: "회색 배경", bg: "#f1f1ef", swatch: "#dfded9" },
  { key: "brown", label: "갈색 배경", bg: "#f4eeee", swatch: "#e2d3ce" },
  { key: "orange", label: "주황 배경", bg: "#faebdd", swatch: "#f0cd9e" },
  { key: "yellow", label: "노랑 배경", bg: "#fbf3db", swatch: "#eddf9a" },
  { key: "green", label: "초록 배경", bg: "#edf3ec", swatch: "#b9dcb4" },
  { key: "blue", label: "파랑 배경", bg: "#e7f3f8", swatch: "#a9d4e5" },
  { key: "purple", label: "보라 배경", bg: "#f6f3f9", swatch: "#cbb6e0" },
  { key: "pink", label: "분홍 배경", bg: "#faf1f5", swatch: "#eab8d1" },
  { key: "red", label: "빨강 배경", bg: "#fdebec", swatch: "#eeacaf" },
];

// 글자색 팔레트 — 배경색(BLOCK_COLORS)과 색 이름은 맞추되, 값은 흰
// 배경 위에서 글자로 읽힐 만큼 진하게 잡았어요(배경색의 옅은 파스텔
// 값을 글자색으로 그대로 쓰면 거의 안 읽혀요). key가 null이면 "기본"
// (색을 따로 안 입히고, 제목/인용 등 블록 타입별 기본 글자색을 그대로
// 써요 — 아래 렌더링에서 style.color를 아예 안 줘서 자연스럽게
// CSS(.block-input--h1 등)를 따라가게 해요).
export const BLOCK_TEXT_COLORS = [
  { key: null, label: "기본", swatch: "#111a2f" },
  { key: "gray", label: "회색 글자", color: "#9b9a97", swatch: "#9b9a97" },
  { key: "brown", label: "갈색 글자", color: "#8a5a3b", swatch: "#8a5a3b" },
  { key: "orange", label: "주황 글자", color: "#d9730d", swatch: "#d9730d" },
  { key: "yellow", label: "노랑 글자", color: "#cb912f", swatch: "#cb912f" },
  { key: "green", label: "초록 글자", color: "#448361", swatch: "#448361" },
  { key: "blue", label: "파랑 글자", color: "#337ea9", swatch: "#337ea9" },
  { key: "purple", label: "보라 글자", color: "#9065b0", swatch: "#9065b0" },
  { key: "pink", label: "분홍 글자", color: "#c14c8a", swatch: "#c14c8a" },
  { key: "red", label: "빨강 글자", color: "#d44c47", swatch: "#d44c47" },
];

// 여러 블록을 한꺼번에 선택했을 때 배경색/글자색을 일괄 적용하는
// 기능(아래 bulkSetColor/bulkSetTextColor)에서 써요 — BlockRow 안의
// isBoardDatabase/isTable/canColorBackground/canColorText와 완전히 같은
// 규칙을 block 하나만 갖고도 판단할 수 있게 순수 함수로 뽑아뒀어요
// (BlockRow는 렌더링 중인 그 블록 하나만 알지만, 일괄 적용은 선택된
// 모든 블록을 하나씩 검사해야 해서 컴포넌트 바깥의 독립 함수가 필요해요).
export function blockIsTableKind(block) {
  return block.type === "DATABASE" && block.database?.kind === "TABLE";
}

export function blockIsBoardDatabase(block) {
  return block.type === "DATABASE" && block.database?.kind !== "TABLE";
}

// 코드 블록은 항상 회색 배경 + 문법 색이라 배경색·글자색을 따로 못 골라요(노션도 코드 블록엔 색 메뉴가 없어요).
export function blockCanHaveBackground(block) {
  return !blockIsBoardDatabase(block) && block.type !== "CODE";
}

export function blockCanHaveTextColor(block) {
  const isPageLink = !!block.pageId;
  const isEmbed =
    block.type === "DATABASE" ||
    block.type === "TASK" ||
    block.type === "EVENT" ||
    block.type === "SPRINT" ||
    block.type === "IMAGE";
  return (!isPageLink && !isEmbed && block.type !== "FILE" && block.type !== "CODE") || blockIsTableKind(block);
}

export function blockIsCardEmbed(block) {
  return (
    block.type === "DATABASE" ||
    block.type === "TASK" ||
    block.type === "EVENT" ||
    block.type === "SPRINT"
  );
}

// 요청: "첫번째(노션)처럼 블록 전체가 색이 변하면 좋을듯" — 스크린샷
// 비교: 노션은 색칠된 인접 블록들이 하나로 이어진 덩어리처럼 보이는데,
// 예전엔 블록마다 독립적으로 둥근 모서리를 줘서 줄마다 떨어진 카드처럼
// 보였어요. 두 블록이 "같은 이유로" .block-body에 배경이 칠해져
// 있는지를 이 키로 비교해서, 같은 키를 가진 바로 위/아래 블록끼리만
// 경계의 모서리를 각지게 만들고 틈도 없애 이어붙여요(BlockRow의
// blendTop/blendBottom, borderRadiusValue). 커스텀 배경색이면 그 색
// 키를, 색은 없지만 지금 열린 메뉴의 "덩어리 강조"(menuOpenHighlight)
// 때문에 칠해진 거라면 "menu-open"을 키로 써요 — 색이 서로 다르면 절대
// 안 이어붙여요. 카드형 임베드(isCardEmbed)와 보드형 데이터베이스
// (blockCanHaveBackground가 false)는 .block-body에 직접 칠하는 대상이
// 아니라(전자는 --block-bg로 카드 자체에, 후자는 아예 색을 못 써요)
// 항상 null이에요.
export function blockPaintKey(block, isHighlighted) {
  // 요청: "블록 종류가 노션보다 적어요" — 콜아웃은 노션에서도 옆 블록과
  // 절대 안 이어붙어요(항상 자기만의 독립된 박스). isCardEmbed와 같은
  // 이유로 여기서 제외해요 — blendTop/blendBottom 비교 대상에서
  // 빠지면 borderRadiusValue가 항상 4개 모서리 전부 둥글게 나와요.
  if (blockIsCardEmbed(block) || !blockCanHaveBackground(block) || block.type === "CALLOUT") return null;
  if (block.color) return `color:${block.color}`;
  return isHighlighted ? "menu-open" : null;
}

// 라벨에 있는 공백("제목 1")까지 정확히 안 쳐도(/제목1) 매칭되도록 공백을
// 지우고 비교해요. exact match(1순위) > startsWith(2순위) > includes(3순위)
// 순으로 점수를 매겨서, "/h1"을 치면 항상 제목 1이 맨 위로 와요.
export function normalizeQuery(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

export function filterBlockTypes(options, query) {
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

// 콜아웃은 노션처럼 안에 여러 줄(문단)을 담을 수 있어야 해서(Shift+Enter로
// 줄바꿈) QUOTE와 같은 자리에 넣었어요. 토글은 바로 아래 이어지는 블록이
// 곧 "펼쳤을 때 보이는 내용"이라, 토글 자기 줄 자체는 글머리 기호/할
// 일처럼 한 줄짜리 항목이에요(여기 안 넣음 — 아래 LIST_TYPES와 같은
// 판단).
export const LIST_TYPES = ["BULLET", "NUMBERED", "TODO"];

// 요청: "인라인 서식" — 문장 중간 일부만 굵게/기울임/밑줄/취소선/인라인
// 코드로 꾸미거나 링크를 걸 수 있는 블록 타입들이에요(RichTextInput.jsx
// 참고). CODE는 일부러 빠졌어요 — 코드 블록엔 노션도 인라인 서식이
// 없고, 순수 텍스트 그대로 유지해야 복사·붙여넣기가 안전해요.
export const RICH_TEXT_TYPES = ["TEXT", "H1", "H2", "H3", "TODO", "BULLET", "NUMBERED", "QUOTE", "TOGGLE", "CALLOUT"];

// 요청: "Shift+Enter 줄바꿈" — 노션은 제목·목록·할 일·토글 안에서도 Shift+Enter로
// 같은 블록 안에서 줄을 바꿀 수 있어요. 인라인 서식이 되는 블록은 전부(+코드) 허용해요.
export const MULTILINE_TYPES = [...RICH_TEXT_TYPES, "CODE"];

// 콜아웃 아이콘(이모지) 고르기 팝오버에서 보여줄 프리셋이에요 — 노션도
// 이모지 피커 전체를 열지만, 여기선 자주 쓰는 것 위주로 간단하게
// 골라 넣었어요(직접 입력은 아직 없음 — 필요하면 나중에 입력창을
// 하나 더 추가하면 돼요).
export const CALLOUT_ICON_PRESETS = ["💡", "📌", "⚠️", "✅", "📝", "🔥", "❗", "ℹ️", "🎯", "📎", "🚀", "⭐"];

export function placeholderFor(type) {
  switch (type) {
    case "H1":
      return "제목 1";
    case "H2":
      return "제목 2";
    case "H3":
      return "제목 3";
    case "TODO":
      return "할 일을 입력하세요";
    case "BULLET":
    case "NUMBERED":
      return "목록 항목";
    case "QUOTE":
      return "인용구를 입력하세요";
    case "CODE":
      return "코드를 입력하세요";
    case "TOGGLE":
      return "토글";
    case "CALLOUT":
      return "콜아웃 입력...";
    default:
      return "내용을 입력하거나 '/'로 블록 추가...";
  }
}
