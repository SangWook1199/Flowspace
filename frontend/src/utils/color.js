// 서버 WorkspaceColor(7종) ↔ 화면 색(#hex). 워크스페이스 만들기의 색 선택지가 이 7개예요.
// 색을 추가하려면 백엔드 WorkspaceColor와 DB enum도 같이 늘려야 해요.
export const WORKSPACE_COLORS = [
  { name: "BLUE", hex: "#4F46E5" },
  { name: "PURPLE", hex: "#9333EA" },
  { name: "GREEN", hex: "#16A34A" },
  { name: "RED", hex: "#EF4444" },
  { name: "ORANGE", hex: "#F59E0B" },
  { name: "PINK", hex: "#EC4899" },
  { name: "GRAY", hex: "#64748B" },
];

const DEFAULT_COLOR = WORKSPACE_COLORS[0];

export const workspaceColorToHex = (name) =>
  (WORKSPACE_COLORS.find((c) => c.name === name) ?? DEFAULT_COLOR).hex;

export const workspaceHexToColor = (hex) =>
  (WORKSPACE_COLORS.find((c) => c.hex.toLowerCase() === String(hex ?? "").toLowerCase()) ?? DEFAULT_COLOR).name;

// 스프린트 색: 서버 WorkspaceColor ↔ 화면 CSS 이름(css) ↔ 색 선택기의 #hex.
// 스프린트 카드·사이드바 점·진행률 막대가 css 이름을 클래스로 써요(styles/sprint-colors.css 참고).
export const SPRINT_COLORS = [
  { name: "BLUE", css: "indigo", hex: "#4f5cf6" },
  { name: "GREEN", css: "green", hex: "#91d8bc" },
  { name: "ORANGE", css: "amber", hex: "#f8b544" },
  { name: "RED", css: "red", hex: "#f16469" },
  { name: "PURPLE", css: "purple", hex: "#a691e9" },
  { name: "PINK", css: "pink", hex: "#ec7fb5" },
  { name: "GRAY", css: "slate", hex: "#d7dde8" },
];

const DEFAULT_SPRINT_COLOR = SPRINT_COLORS[0];

const findSprintColor = (predicate) => SPRINT_COLORS.find(predicate) ?? DEFAULT_SPRINT_COLOR;

export const sprintColorToCss = (name) => findSprintColor((c) => c.name === name).css;

export const sprintHexToColor = (hex) =>
  findSprintColor((c) => c.hex.toLowerCase() === String(hex ?? "").toLowerCase()).name;
