import { stripHtml } from "../RichTextInput";
import { RICH_TEXT_TYPES } from "./blockTypes.js";

// 노션의 마크다운 단축키 — 빈 텍스트 블록 맨 앞에서 "- ", "1. ", "# " 등을 치면 그
// 자리에서 블록 타입이 바뀌어요("> "는 노션에서 토글, 따옴표(") + 공백이 인용이에요).
export function matchMarkdownShortcut(value) {
  const text = stripHtml(value).replace(/\u00a0/g, " ");
  if (text === "---") return { type: "DIVIDER" };
  if (text === "```") return { type: "CODE" };
  if (!text.endsWith(" ") || text.length > 6) return null;
  const head = text.slice(0, -1);
  if (head === "-" || head === "*" || head === "+") return { type: "BULLET" };
  if (/^\d+\.$/.test(head)) return { type: "NUMBERED" };
  if (head === "[]" || head === "[ ]") return { type: "TODO" };
  if (head === "#") return { type: "H1" };
  if (head === "##") return { type: "H2" };
  if (head === "###") return { type: "H3" };
  if (head === ">") return { type: "TOGGLE" };
  if (head === '"' || head === "\u201c" || head === "\u201d") return { type: "QUOTE" };
  return null;
}

// 여러 줄을 붙여넣을 때 각 줄의 앞머리(마크다운 표기)를 보고 블록 타입을 정해요.
export function parseMarkdownLine(line) {
  let m;
  if ((m = /^\s*(?:[-*+])\s+\[( |x|X)\]\s+(.*)$/.exec(line))) return { type: "TODO", checked: m[1] !== " ", text: m[2] };
  if ((m = /^\s*\[( |x|X)?\]\s+(.*)$/.exec(line))) return { type: "TODO", checked: !!m[1] && m[1] !== " ", text: m[2] };
  if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) return { type: "BULLET", text: m[1] };
  if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) return { type: "NUMBERED", text: m[1] };
  if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) return { type: `H${m[1].length}`, text: m[2] };
  if ((m = /^>\s+(.*)$/.exec(line))) return { type: "QUOTE", text: m[1] };
  return { type: null, text: line };
}

// 블록 복사/붙여넣기용. 클립보드에 (1) 다른 앱에 붙여넣어도 읽히는 마크다운 글자와 (2) 우리
// 에디터끼리 구조(타입·들여쓰기·체크 상태·서식)를 그대로 옮기는 JSON을 같이 실어요.
export const BLOCKS_CLIPBOARD_TYPE = "application/x-flowspace-blocks";

export function blocksToPlainText(list) {
  const base = list.reduce((m, b) => Math.min(m, b.indent || 0), Infinity);
  const counters = {};
  return list
    .map((b) => {
      const level = (b.indent || 0) - (Number.isFinite(base) ? base : 0);
      const pad = "  ".repeat(Math.max(0, level));
      const text = RICH_TEXT_TYPES.includes(b.type) ? stripHtml(b.content).replace(/\u00a0/g, " ") : b.content || "";
      if (b.type !== "NUMBERED") delete counters[level];
      switch (b.type) {
        case "BULLET":
          return `${pad}- ${text}`;
        case "NUMBERED":
          counters[level] = (counters[level] || 0) + 1;
          return `${pad}${counters[level]}. ${text}`;
        case "TODO":
          return `${pad}- [${b.checked ? "x" : " "}] ${text}`;
        case "H1":
          return `${pad}# ${text}`;
        case "H2":
          return `${pad}## ${text}`;
        case "H3":
          return `${pad}### ${text}`;
        case "QUOTE":
          return `${pad}> ${text}`;
        case "TOGGLE":
          return `${pad}> ${text}`;
        case "DIVIDER":
          return `${pad}---`;
        case "CODE":
          return `${pad}\`\`\`\n${text}\n${pad}\`\`\``;
        default:
          return `${pad}${text}`;
      }
    })
    .join("\n");
}

export function blocksToClipboardJson(list) {
  const base = list.reduce((m, b) => Math.min(m, b.indent || 0), Infinity);
  const items = list.map((b) => {
    const { id, ...rest } = b;
    const rel = (b.indent || 0) - (Number.isFinite(base) ? base : 0);
    if (rel > 0) rest.indent = rel;
    else delete rest.indent;
    return rest;
  });
  return JSON.stringify({ v: 1, blocks: items });
}
