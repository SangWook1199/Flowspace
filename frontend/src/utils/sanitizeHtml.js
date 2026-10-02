// 리치 텍스트(상세 설명 등)의 HTML을 안전하게 걸러주는 공용 함수예요.
// contentEditable에 붙여넣기/드롭한 HTML이나 서버에서 내려온 HTML을 그대로 innerHTML에 꽂으면
// <img onerror=...> 같은 걸로 스크립트가 실행될 수 있어서(XSS), 항상 이 함수를 거쳐서 써요.
// 파싱은 <template> 안에서만 해요 — template 안의 DOM은 "비활성"이라 이미지가 로드되거나
// 이벤트 핸들러가 돌지 않아서, 걸러내기 전에 코드가 실행될 일이 없어요.

// 에디터 툴바(굵게/기울임/목록/링크)와 줄바꿈에서 실제로 생기는 태그만 허용해요.
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A", "BR", "P", "DIV"]);

// 이 태그들은 껍데기만 벗기는 게 아니라 안쪽 내용까지 통째로 버려요(스크립트 글자가 본문에 남으면 안 되니까요).
const DROP_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "SVG", "MATH",
  "TEXTAREA", "SELECT", "OPTION", "BUTTON", "INPUT", "FORM", "LINK", "META", "TITLE", "HEAD",
]);

// 링크는 http / https / mailto만 허용해요(javascript: 같은 건 막아요). 공백·제어문자를 이용한
// "java\tscript:" 꼼수도 있어서, 먼저 그런 문자를 지우고 검사해요.
export const isSafeUrl = (value) => {
  if (typeof value !== "string") return false;
  // eslint-disable-next-line no-control-regex
  const compact = value.replace(/[\u0000- \u007f-\u009f]/g, "");
  return /^(https?:\/\/|mailto:)/i.test(compact);
};

const sanitizeChildren = (parent) => {
  // 자식을 바꾸는 동안 목록이 흔들리니까 먼저 복사해서 돌아요.
  Array.from(parent.childNodes).forEach((node) => {
    if (node.nodeType === 3) return; // 텍스트는 그대로 둬요.

    if (node.nodeType !== 1) {
      node.remove(); // 주석 등은 필요 없어요.
      return;
    }

    const tag = node.tagName.toUpperCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      node.remove();
      return;
    }

    sanitizeChildren(node);

    if (!ALLOWED_TAGS.has(tag)) {
      // 허용 안 하는 태그는 껍데기만 벗기고 안쪽(이미 걸러진) 내용은 살려요.
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }

    const href = tag === "A" ? node.getAttribute("href") : null;
    Array.from(node.attributes).forEach((attr) => node.removeAttribute(attr.name));

    if (tag === "A") {
      if (isSafeUrl(href)) {
        node.setAttribute("href", href.trim());
        node.setAttribute("rel", "noopener noreferrer");
      } else {
        node.replaceWith(...Array.from(node.childNodes)); // 위험한 링크는 글자만 남겨요.
      }
    }
  });
};

const escapeText = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// HTML 문자열 → 허용된 태그/속성만 남은 안전한 HTML 문자열.
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== "string") return "";
  // DOM이 없는 환경(SSR/테스트)에서는 태그를 전부 글자로 바꿔서 안전하게 돌려줘요.
  if (typeof document === "undefined") return escapeText(html);

  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeChildren(template.content);
  return template.innerHTML;
};

// 글자 수 세기용 — HTML에서 태그를 빼고 순수 글자만 꺼내요.
export const htmlToText = (html) => {
  if (!html || typeof html !== "string") return "";
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");

  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent ?? "";
};

// 일반 글자(붙여넣은 text/plain) → 줄바꿈이 <br>로 살아있는 안전한 HTML.
export const textToHtml = (text) => escapeText(text ?? "").replace(/\r?\n/g, "<br>");
