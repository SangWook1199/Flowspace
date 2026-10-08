// 서버 WorkspaceColor(8종) ↔ 화면 색(#hex). 워크스페이스 만들기의 색 선택지가 이 8개예요.
// 색을 추가하려면 백엔드 WorkspaceColor와 DB enum도 같이 늘려야 해요.
// 흰색이 있는 줄 모르는 사람이 많아서 선택지 맨 앞에 뒀어요(기본값은 여전히 BLUE).
export const WORKSPACE_COLORS = [
  { name: "WHITE", hex: "#FFFFFF" },
  { name: "BLUE", hex: "#4F46E5" },
  { name: "PURPLE", hex: "#9333EA" },
  { name: "GREEN", hex: "#16A34A" },
  { name: "RED", hex: "#EF4444" },
  { name: "ORANGE", hex: "#F59E0B" },
  { name: "PINK", hex: "#EC4899" },
  { name: "GRAY", hex: "#64748B" },
];

// 흰 배경 위에서는 글자·테두리가 안 보여서, 흰색 계열인지 알려주는 헬퍼예요.
export const isLightHex = (hex) => String(hex ?? "").toLowerCase() === "#ffffff";

// 흰색 선택지의 테두리·체크 색이에요. 검정은 다른 파스텔 색들 사이에서 너무 튀어서, 배경과는 구분되는 중간 회색을 써요.
// (CSS에서 흰색 칩·점에 쓰는 테두리 색도 같은 #94a3b8이에요.)
export const LIGHT_OUTLINE = "#94a3b8";
export const LIGHT_INK = "#475569";

// 색 막대·점·선의 배경 스타일. 흰색이면 얇은 회색 테두리와 진한 글자색을 같이 줘서 흰 바탕에서도 보이게 해요.
export const swatchStyle = (hex) =>
  isLightHex(hex)
    ? { background: "#FFFFFF", color: "#334155", boxShadow: `inset 0 0 0 1px ${LIGHT_OUTLINE}` }
    : { background: hex };

// 연한 배경 + 같은 계열 글자색(일정 막대, 배너 아이콘). 흰색은 얇은 회색 테두리의 연한 회색 칩으로 보여줘요.
export const tintStyle = (hex, alpha = "22") =>
  isLightHex(hex)
    ? { background: "#F8FAFC", color: LIGHT_INK, boxShadow: `inset 0 0 0 1px ${LIGHT_OUTLINE}` }
    : { background: `${hex}${alpha}`, color: hex };

// 글자·진행 숫자처럼 색만 쓰는 곳. 흰색 글자는 안 보이니 진한 회색으로 바꿔요.
export const inkColor = (hex) => (isLightHex(hex) ? "#475569" : hex);

const DEFAULT_COLOR = WORKSPACE_COLORS.find((c) => c.name === "BLUE");

export const workspaceColorToHex = (name) =>
  (WORKSPACE_COLORS.find((c) => c.name === name) ?? DEFAULT_COLOR).hex;

export const workspaceHexToColor = (hex) =>
  (WORKSPACE_COLORS.find((c) => c.hex.toLowerCase() === String(hex ?? "").toLowerCase()) ?? DEFAULT_COLOR).name;

// 스프린트 색: 서버 WorkspaceColor ↔ 화면 CSS 이름(css) ↔ 색 선택기의 #hex.
// 스프린트 카드·사이드바 점·진행률 막대가 css 이름을 클래스로 써요(styles/sprint-colors.css 참고).
export const SPRINT_COLORS = [
  { name: "WHITE", css: "white", hex: "#ffffff" },
  { name: "BLUE", css: "indigo", hex: "#4f5cf6" },
  { name: "GREEN", css: "green", hex: "#91d8bc" },
  { name: "ORANGE", css: "amber", hex: "#f8b544" },
  { name: "RED", css: "red", hex: "#f16469" },
  { name: "PURPLE", css: "purple", hex: "#a691e9" },
  { name: "PINK", css: "pink", hex: "#ec7fb5" },
  { name: "GRAY", css: "slate", hex: "#d7dde8" },
];

const DEFAULT_SPRINT_COLOR = SPRINT_COLORS.find((c) => c.name === "BLUE");

const findSprintColor = (predicate) => SPRINT_COLORS.find(predicate) ?? DEFAULT_SPRINT_COLOR;

export const sprintColorToCss = (name) => findSprintColor((c) => c.name === name).css;

export const sprintHexToColor = (hex) =>
  findSprintColor((c) => c.hex.toLowerCase() === String(hex ?? "").toLowerCase()).name;

// 서버 색 이름 → 색 선택기의 #hex(스프린트 수정 화면이 처음 값을 채울 때 써요).
export const sprintColorToHex = (name) => findSprintColor((c) => c.name === name).hex;
