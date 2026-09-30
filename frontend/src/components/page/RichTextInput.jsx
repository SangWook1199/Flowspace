import { useEffect, useRef } from "react";

/* ================= RichTextInput =================
   요청: "인라인 서식" — 노션처럼 문장 중간 일부만 굵게/기울임/밑줄/
   취소선/인라인 코드로 꾸미거나 링크를 걸 수 있어야 해요. 지금까지는
   블록 내용이 전부 <input>/<textarea>의 value(순수 문자열)라서, 애초에
   "글자 일부만 다르게" 표현할 방법이 없었어요(문자열 하나에는 서식을
   부분적으로 못 실어요). 그래서 텍스트를 다루는 블록(TEXT/H1/H2/TODO/
   BULLET/NUMBERED/QUOTE — BlockEditor.jsx의 RICH_TEXT_TYPES)만
   contentEditable div로 바꾸고, 서식은 실제 인라인 태그(b/i/u/s/code/a)로
   DOM에 심어서 block.content에 그 HTML 문자열을 그대로 저장해요. 코드
   블록은 서식이라는 개념 자체가 안 어울려서(노션도 코드 블록엔 인라인
   서식이 없어요) 그대로 AutoTextarea·순수 텍스트로 남겨뒀어요.

   contentEditable을 React state로 "완전히 제어"하려 하면(매 렌더마다
   dangerouslySetInnerHTML로 새로 밀어넣으면) 커서 위치가 매 글자마다
   맨 앞으로 튕겨요 — 그래서 여기서는 "타이핑하는 동안은 DOM이 진실,
   React state는 그 결과를 반영만" 하는 절반 비제어 패턴을 써요: 마운트
   시점과, 외부에서(예: 실행취소) value가 바뀐 시점에만 DOM에 다시
   써주고, 사용자가 직접 친 입력은 onInput에서 읽어서 그대로 state로
   올려보내기만 해요(DOM을 다시 쓰지 않음 — 이미 DOM=state라 쓸 필요가
   없어요). */

// 우리가 실제로 만들어서 저장하는 인라인 태그만 화이트리스트로 둬요.
// 그 외(붙여넣기로 따라 들어온 <span style>, <div>, <font> 등)는 태그만
// 벗기고 안의 글자는 살려서 이어붙여요 — 서식은 사라지지만 내용은
// 안 사라져요.
const ALLOWED_TAGS = new Set(["B", "I", "U", "S", "STRIKE", "CODE", "A", "BR", "SPAN"]);
// 인라인 색: <span data-c="red">(글자색) / <span data-bg="red">(배경색)만 허용해요. 값은 아래 키만 통과해요.
const INLINE_COLOR_KEYS = new Set(["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"]);

export function isSafeHref(href) {
  return /^(https?:|mailto:|tel:|#|\/)/i.test((href || "").trim());
}

// 사용자가 입력한 주소를 링크로 쓸 수 있는 꼴로 다듬어요. 스킴이 없으면 https://를 붙이고,
// 허용되지 않는 스킴(javascript: 등)이면 null.
export function normalizeLinkUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return null;
  if (isSafeHref(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

function sanitizeNode(node) {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }
    sanitizeNode(child);
    if (!ALLOWED_TAGS.has(child.tagName)) {
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      node.removeChild(child);
      continue;
    }
    const colorAttrs = {};
    if (child.tagName === "SPAN") {
      const c = child.getAttribute("data-c");
      const bg = child.getAttribute("data-bg");
      if (c && INLINE_COLOR_KEYS.has(c)) colorAttrs["data-c"] = c;
      if (bg && INLINE_COLOR_KEYS.has(bg)) colorAttrs["data-bg"] = bg;
    }
    let href = child.tagName === "A" ? child.getAttribute("href") : null;
    // javascript: 같은 위험한 주소는 링크로 안 살리고 글자만 남겨요.
    if (href && !isSafeHref(href)) href = null;
    Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
    if ((child.tagName === "A" && !href) || (child.tagName === "SPAN" && Object.keys(colorAttrs).length === 0)) {
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      node.removeChild(child);
      continue;
    }
    Object.entries(colorAttrs).forEach(([k, v]) => child.setAttribute(k, v));
    if (href) {
      child.setAttribute("href", href);
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noreferrer");
    }
  }
}

// onInput마다 불러서 붙여넣기 등으로 섞여 들어온 허용 안 된 태그를
// 걸러내요. 우리 쪽 서식 토글 함수들(toggleBold 등)은 항상 화이트리스트
// 안의 태그만 만들어서, 평소 타이핑 중엔 이 함수가 실제로 뭔가를
// 바꾸는 일이 거의 없어요(그래서 커서가 거의 안 튀어요).
export function sanitizeInlineHtml(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  sanitizeNode(container);
  // 인라인 마크다운 변환 직후 커서 자리를 잡아두는 보이지 않는 글자(\u200b)는 저장값에 남기지 않아요.
  let result = container.innerHTML.replace(/\u200b/g, "");
  // <br> 하나만 덜렁 남은 경우(다 지웠는데 브라우저가 빈 줄 유지용으로
  // 넣어준 것)는 "완전히 빈 것"으로 취급해요 — 안 그러면 block.content가
  // ""가 아니라 "<br>"가 돼서, 이 값에 기대는 다른 로직들(빈 블록 판정,
  // 슬래시 메뉴, Backspace로 블록 삭제 등)이 다 깨져요.
  if (/^(<br\s*\/?>)*$/i.test(result.trim())) result = "";
  return result;
}

// 서식 관련 로직 바깥(슬래시 메뉴 트리거, "이 블록이 비어있나" 판정 등)은
// 여전히 "눈에 보이는 글자"만 알면 돼요 — HTML 태그는 무시하고 순수
// 텍스트만 뽑아요.
export function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

// 예전 데이터(이 기능이 생기기 전, <input>/<textarea>의 value로만
// 저장됐던 순수 문자열)를 안전하게 HTML로 승격시켜요. textContent에
// 대입했다가 다시 innerHTML로 읽으면 <, >, & 같은 글자가 전부 올바르게
// 이스케이프돼요 — 이 함수를 안 거치면, 예전에 "a < b"처럼 저장된
// 블록을 그대로 innerHTML에 부어버려서 "< b"를 태그 시작으로 오인해
// 내용이 깨져요. BlockEditor.jsx가 페이지를 불러올 때 블록마다 딱
// 한 번만 이걸 거치고, 그 뒤로는 block.richText:true가 붙어서 다시는
// 이 함수를 안 타요(이미 올바른 HTML이라 또 거치면 "&"가 "&amp;"로
// 이중 이스케이프돼요).
export function escapePlainTextToHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// 클립보드의 HTML에서 인라인 서식(굵게/기울임/밑줄/취소선/코드/링크)만 뽑아요. <strong>·<em>이나
// 웹/문서 앱이 style로 표현한 굵게·기울임도 우리 태그로 옮겨요. 서식이 하나도 없으면 null.
function clipboardHtmlToInline(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style,script,meta,title,link,head").forEach((n) => n.remove());
  const root = doc.body;
  const swap = (el, tag) => {
    const n = doc.createElement(tag);
    while (el.firstChild) n.appendChild(el.firstChild);
    el.replaceWith(n);
    return n;
  };
  const wrapChildren = (el, tag) => {
    const n = doc.createElement(tag);
    while (el.firstChild) n.appendChild(el.firstChild);
    el.appendChild(n);
  };
  Array.from(root.querySelectorAll("*")).forEach((el) => {
    const tag = el.tagName;
    const st = el.style || {};
    const weight = st.fontWeight;
    const isBoldStyle = weight === "bold" || weight === "bolder" || Number(weight) >= 600;
    if (tag === "B" || tag === "STRONG") {
      // 구글 문서가 통째로 감싸는 <b style="font-weight:normal">은 굵게가 아니에요.
      if (weight === "normal" || Number(weight) < 600) {
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        el.remove();
        return;
      }
      if (tag === "STRONG") swap(el, "b");
      return;
    }
    if (tag === "EM" || tag === "CITE") return void swap(el, "i");
    if (tag === "DEL") return void swap(el, "s");
    if (tag === "INS") return void swap(el, "u");
    if (isBoldStyle) wrapChildren(el, "b");
    if (st.fontStyle === "italic") wrapChildren(el, "i");
    const deco = st.textDecorationLine || st.textDecoration || "";
    if (/underline/.test(deco) && tag !== "A") wrapChildren(el, "u");
    if (/line-through/.test(deco)) wrapChildren(el, "s");
  });
  const cleaned = sanitizeInlineHtml(root.innerHTML);
  return /<(b|i|u|s|strike|code|a|span)[\s>]/i.test(cleaned) ? cleaned : null;
}

// 노션처럼 마크다운 인라인 표기를 치면 그 자리에서 서식으로 바꿔요:
// **굵게** / __굵게__, *기울임* / _기울임_, `코드`, ~~취소선~~. 닫는 기호를 막 친 순간에만 검사해요.
const INLINE_MD_RULES = [
  { tag: "b", re: /(?:\*\*|__)(?=\S)([^*_]*?\S)(?:\*\*|__)$/ },
  { tag: "s", re: /~~(?=\S)([^~]*?\S)~~$/ },
  { tag: "code", re: /`([^`]+)`$/ },
  { tag: "i", re: /(?<![*\w])\*(?=[^\s*])([^*]*?[^\s*])\*$/ },
  { tag: "i", re: /(?<![\w_])_(?=[^\s_])([^_]*?[^\s_])_$/ },
];

function applyInlineMarkdown(rootEl, nativeEvent) {
  if (!nativeEvent || nativeEvent.inputType !== "insertText" || !/^[*_`~]$/.test(nativeEvent.data || "")) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE || !rootEl.contains(node)) return null;
  // 이미 코드 안이면 기호는 그냥 글자예요.
  for (let n = node.parentElement; n && n !== rootEl; n = n.parentElement) {
    if (n.tagName === "CODE") return null;
  }
  const offset = sel.anchorOffset;
  const before = node.data.slice(0, offset).replace(/\u00a0/g, " ");
  for (const rule of INLINE_MD_RULES) {
    const m = rule.re.exec(before);
    if (!m) continue;
    const range = document.createRange();
    range.setStart(node, m.index);
    range.setEnd(node, offset);
    range.deleteContents();
    const el = document.createElement(rule.tag);
    el.textContent = m[1];
    range.insertNode(el);
    // 서식 요소 바로 뒤(바깥)에 커서를 둬요 — 이어서 치는 글자는 서식이 안 걸려요.
    // 크롬은 서식 요소 바로 뒤 커서를 요소 "안"으로 되돌려서, 이어 치는 글자에 서식이 계속 걸려요.
    // 그래서 요소 뒤에 보이지 않는 글자(\u200b) 하나를 두고 그 뒤에 커서를 놓아요. 이 글자는 저장값에서
    // 빠지고, 다음 글자를 치면(조합 입력은 조합이 끝나면) DOM에서도 지워져요.
    const after = document.createTextNode("\u200b");
    el.after(after);
    const caret = document.createRange();
    caret.setStart(after, 1);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    return after;
  }
  return null;
}

// sentinel 노드에 실제 글자가 붙었으면 \u200b만 걷어내고 커서 위치를 보정해요.
function cleanupSentinel(node) {
  if (!node || !node.isConnected || node.data.length <= 1 || !node.data.includes("\u200b")) return false;
  const sel = window.getSelection();
  let caretOffset = null;
  if (sel && sel.rangeCount > 0 && sel.isCollapsed && sel.anchorNode === node) caretOffset = sel.anchorOffset;
  const zeros = (node.data.slice(0, caretOffset ?? 0).match(/\u200b/g) || []).length;
  node.data = node.data.replace(/\u200b/g, "");
  if (caretOffset !== null) {
    const r = document.createRange();
    r.setStart(node, Math.max(0, caretOffset - zeros));
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  return true;
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export default function RichTextInput({
  id,
  innerRef,
  className,
  style,
  value,
  placeholder,
  showPlaceholder,
  onChange,
  onKeyDown,
  onPasteImage,
  onFocus,
  onBlur,
}) {
  const elRef = useRef(null);
  // 방금 우리가 onChange로 올려보낸 값(=DOM과 이미 같은 값)을 기억해요.
  // value prop이 이거랑 다르면 "내가 아니라 바깥(실행취소·블록 복제 등)
  // 에서 바뀐 것"이라는 뜻이라, 그때만 DOM을 다시 써요.
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (value !== lastSyncedRef.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
    lastSyncedRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const sentinelRef = useRef(null);

  const handleInput = (e) => {
    const composing = !!e.nativeEvent?.isComposing;
    if (!composing && sentinelRef.current) {
      if (cleanupSentinel(sentinelRef.current)) sentinelRef.current = null;
    }
    const created = applyInlineMarkdown(e.currentTarget, e.nativeEvent);
    if (created) sentinelRef.current = created;
    // 보이지 않는 sentinel 글자는 비교/저장에서 빼요(DOM에는 남아 있어도 값이 "다르다"고 보지 않게).
    const raw = e.currentTarget.innerHTML.replace(/\u200b/g, "");
    const clean = sanitizeInlineHtml(raw);
    if (clean !== raw) {
      // sanitize가 실제로 뭔가 걷어냈으면(붙여넣기로 섞여 들어온 태그,
      // 다 지웠을 때 남은 <br> 등) DOM도 정리된 값으로 다시 맞춰요.
      // 커서는 어차피 그런 경우 대부분 "막 비웠을 때"라 끝으로 되돌려도
      // 체감상 어색하지 않아요.
      e.currentTarget.innerHTML = clean;
      placeCaretAtEnd(e.currentTarget);
    }
    lastSyncedRef.current = clean;
    onChange(clean);
  };

  const handlePaste = (e) => {
    // 이미지가 클립보드에 있으면 기존 로직(handlePasteImage)이 먼저
    // 처리하고 preventDefault까지 해요 — 그럼 여기선 더 손댈 게 없어요.
    onPasteImage?.(e);
    if (e.defaultPrevented) return;

    // 그 외(텍스트)는 항상 "일반 텍스트"로만 붙여넣어요 — 예전 input/
    // textarea와 동일한 동작이에요. 웹페이지에서 복사한 굵은 글씨·색·
    // 표 같은 서식이 그대로 딸려 들어오면 우리가 허용하지 않는 마크업이
    // 섞여요.
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";

    // 한 줄짜리 글자를 서식(굵게·링크 등)째 복사했다면 서식도 같이 붙여요. 여러 줄은 위의
    // onPasteImage 쪽에서 블록으로 나뉘어 이미 처리돼요.
    // 글자를 선택한 채 URL을 붙여넣으면 그 글자에 링크를 걸어요(노션과 같아요).
    const sel = window.getSelection();
    if (
      sel &&
      !sel.isCollapsed &&
      /^https?:\/\/\S+$/i.test(text.trim()) &&
      e.currentTarget.contains(sel.anchorNode) &&
      !getAncestorTag("a", e.currentTarget)
    ) {
      document.execCommand("createLink", false, text.trim());
      return;
    }

    if (!/[\r\n]/.test(text)) {
      const inline = clipboardHtmlToInline(e.clipboardData?.getData("text/html"));
      const inlineText = inline ? stripHtml(inline).replace(/\u00a0/g, " ") : "";
      if (inline && inlineText.trim() === text.replace(/\u00a0/g, " ").trim()) {
        document.execCommand("insertHTML", false, inline);
        return;
      }
    }
    document.execCommand("insertText", false, text);
  };

  return (
    <div
      ref={(el) => {
        elRef.current = el;
        if (typeof innerRef === "function") innerRef(el);
      }}
      className={className}
      style={style}
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder || "블록 내용"}
      suppressContentEditableWarning
      spellCheck={false}
      data-rich-block-id={id}
      data-placeholder={showPlaceholder ? placeholder : undefined}
      onInput={handleInput}
      onCompositionEnd={() => {
        if (sentinelRef.current && cleanupSentinel(sentinelRef.current)) sentinelRef.current = null;
      }}
      onKeyDown={(e) => {
        // 변환 직후(보이지 않는 글자 바로 뒤)에서 Backspace를 누르면 그 글자를 지우는 대신 서식 요소 끝의
        // 글자를 지워야 자연스러워요 — 커서를 요소 끝으로 옮긴 뒤 기본 동작에 맡겨요.
        const node = sentinelRef.current;
        if (e.key === "Backspace" && node && node.isConnected && node.data === "\u200b") {
          const sel = window.getSelection();
          if (sel && sel.isCollapsed && sel.anchorNode === node && sel.anchorOffset === 1) {
            const prev = node.previousSibling;
            node.remove();
            sentinelRef.current = null;
            if (prev) {
              const r = document.createRange();
              r.selectNodeContents(prev);
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        } else if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta" && e.key.length > 1 && e.key !== "Process") {
          // 방향키 등으로 커서를 옮기면 더는 "변환 직후"가 아니에요.
          sentinelRef.current = null;
        }
        onKeyDown?.(e);
      }}
      onPaste={handlePaste}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

/* ================= 인라인 서식 토글 =================
   Bold/Italic/Underline/Strikethrough는 document.execCommand로
   처리해요 — 스펙상 "권장 안 함"이지만 크로미움 계열 브라우저(이 앱이
   실제로 도는 환경)에서 지금도 안정적으로 동작하고, 이미 서식이 걸린
   자리 위에서 다시 누르면 알아서 꺼지는 토글·부분 겹침 처리·인접한
   같은 태그 병합까지 브라우저가 다 대신해줘요 — 이걸 Range API로 직접
   구현하면 코드량과 버그 가능성이 훨씬 커져요. 인라인 코드·링크는
   execCommand에 꼭 맞는 명령이 없어서(코드) 또는 별도 처리가 필요해서
   (링크: 이미 걸려있으면 해제) 직접 Range를 다뤄요. */

function getAncestorTag(tagName, rootEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName) {
      return node;
    }
    if (node === rootEl) return null;
    node = node.parentElement;
  }
  return null;
}

function safeQueryState(command) {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

export function getActiveMarks(rootEl) {
  return {
    bold: safeQueryState("bold"),
    italic: safeQueryState("italic"),
    underline: safeQueryState("underline"),
    strike: safeQueryState("strikeThrough"),
    code: !!getAncestorTag("code", rootEl),
    link: !!getAncestorTag("a", rootEl),
  };
}

export function toggleBold() {
  document.execCommand("bold");
}
export function toggleItalic() {
  document.execCommand("italic");
}
export function toggleUnderline() {
  document.execCommand("underline");
}
export function toggleStrike() {
  document.execCommand("strikeThrough");
}

// 인라인 코드는 execCommand에 맞는 명령이 없어서 직접 <code>로 감싸거나
// 벗겨요. execCommand와 달리 이 DOM 조작은 input 이벤트를 자동으로 안
// 일으켜서, 끝에서 직접 한 번 쏴줘요(RichTextInput의 onInput이 그걸
// 듣고 state에 반영해요).
export function toggleInlineCode(rootEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const existing = getAncestorTag("code", rootEl);
  if (existing) {
    const parent = existing.parentNode;
    if (!parent) return;
    while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
    parent.removeChild(existing);
    rootEl?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (sel.isCollapsed) return; // 선택된 글자가 없으면 감쌀 대상이 없어요.
  const range = sel.getRangeAt(0);
  const codeEl = document.createElement("code");
  codeEl.appendChild(range.extractContents());
  range.insertNode(codeEl);

  const newRange = document.createRange();
  newRange.selectNodeContents(codeEl);
  sel.removeAllRanges();
  sel.addRange(newRange);
  rootEl?.dispatchEvent(new Event("input", { bubbles: true }));
}

// 링크는 execCommand('createLink'/'unlink')를 그대로 써요 — 둘 다
// 표준 명령이고 input 이벤트도 자동으로 일으켜줘요. 이미 링크 위라면
// 해제만, 아니라면 URL을 물어보고 새로 걸어요.
// askUrl(rootEl)이 주어지면 브라우저 기본 prompt 대신 그걸(에디터의 링크 팝오버) 열어요.
export function toggleLink(rootEl, askUrl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  if (getAncestorTag("a", rootEl)) {
    document.execCommand("unlink");
    return;
  }

  if (sel.isCollapsed) return;
  if (askUrl) {
    askUrl(rootEl);
    return;
  }
  const url = normalizeLinkUrl(window.prompt("링크 URL을 입력하세요", "https://"));
  if (!url) return;
  document.execCommand("createLink", false, url);
}

/* ================= 여러 블록에 걸친 선택에 서식 적용 =================
   요청: "노션처럼 블록이 아니라 텍스트만 다중 선택이 되고, 그 상태에서
   인라인 편집기가 떠서 편집" — 위의 toggleBold 등은 전부 execCommand
   기반인데, execCommand는 스펙상 "하나의 editable 영역 안"에서만
   믿을 수 있게 동작해요. 이 앱은 블록마다 contentEditable이 따로
   있어서(RichTextInput 하나당 하나), 사용자가 텍스트 중간에서 시작해
   다른 블록까지 드래그하면 브라우저 네이티브 Selection/Range 자체는
   여러 블록에 걸쳐 정상적으로 늘어나지만(window.getSelection()이 그
   범위를 그대로 들고 있어요), 그 위에서 execCommand('bold') 같은 걸
   실행하면 블록 경계를 넘는 부분은 브라우저마다 결과가 들쭉날쭉해요.

   그래서 여러 블록에 걸친 선택일 때만, execCommand 대신 선택 범위를
   블록 하나하나의 몫으로 직접 잘라서(clampRangeToRoot) 그 조각마다
   손으로 태그를 감싸거나 벗겨요 — 이미 있던 toggleInlineCode의
   extractContents→감싸기→insertNode 패턴을 모든 마크(굵게/기울임/
   밑줄/취소선/코드/링크)에 공통으로 재사용해요. 블록 하나짜리 선택은
   지금처럼 계속 execCommand를 써요(그쪽이 더 안정적이고, 이미 검증된
   경로라 굳이 바꿀 이유가 없어요) — 이 함수들은 "선택이 2개 이상의
   블록에 걸쳐 있을 때"만 호출돼요. */

// globalRange 중 rootEl(어떤 블록의 contentEditable 루트) 안에 해당하는
// 부분만 잘라낸 새 Range를 돌려줘요. rootEl 전체를 가리키는 Range에서
// 시작해서, globalRange의 시작/끝이 그 안쪽에 있으면 그 지점으로
// 당겨와요(양쪽 다 바깥에 있으면 rootEl 전체가 이미 선택 범위 "안"이라는
// 뜻이라 그대로 둬요).
function clampRangeToRoot(globalRange, rootEl) {
  const local = document.createRange();
  local.selectNodeContents(rootEl);
  if (globalRange.compareBoundaryPoints(Range.START_TO_START, local) > 0) {
    local.setStart(globalRange.startContainer, globalRange.startOffset);
  }
  if (globalRange.compareBoundaryPoints(Range.END_TO_END, local) < 0) {
    local.setEnd(globalRange.endContainer, globalRange.endOffset);
  }
  return local;
}

// getAncestorTag와 같은 생각이지만, "지금 선택"이 아니라 임의의 range를
// 받아요 — range의 commonAncestorContainer에서 rootEl까지 거슬러
// 올라가며 tagName을 찾고, 못 찾으면(또는 rootEl에 닿기 전에 못
// 찾으면) null. range 전체가 그 태그 안에 완전히 들어있을 때만 true로
// 잡혀요(부분만 걸쳐 있으면 commonAncestorContainer가 그 태그 바깥이라
// null — "부분 겹침은 아직 다 안 켜진 것"으로 보는 셈이라 execCommand의
// 흔한 관례와 비슷해요).
function getAncestorTagForRange(range, tagName, rootEl) {
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName) return node;
    if (node === rootEl) return null;
    node = node.parentElement;
  }
  return null;
}

// 지금 네이티브 선택(window.getSelection())을 blocks(선택과 겹치는
// 블록들, { blockId, rootEl } 문서 순서 배열) 각각의 몫으로 잘라서
// 돌려줘요 — applyMarkAcrossBlocks와 isMarkActiveAcrossBlocks가 같이
// 써요.
function getLocalRanges(blocks) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const globalRange = sel.getRangeAt(0);
  return blocks.map(({ rootEl }) => clampRangeToRoot(globalRange, rootEl));
}

// 여러 블록에 걸친 선택 전체가 이미 그 태그로 덮여 있는지 — 툴바
// 버튼의 "지금 켜져 있음" 표시(is-active)에 써요.
export function isMarkActiveAcrossBlocks(tagName, blocks) {
  const localRanges = getLocalRanges(blocks);
  if (!localRanges || localRanges.length === 0) return false;
  return localRanges.every(
    (range, i) => range.collapsed || !!getAncestorTagForRange(range, tagName, blocks[i].rootEl),
  );
}

// 여러 블록에 걸친 선택에 tagName을 켜거나 꺼요. mode를 안 주면 지금
// 전체가 다 켜져 있는지를 보고 자동으로 반대로(꺼져 있으면 켜기, 이미
// 다 켜져 있으면 끄기) 정해요 — 링크처럼 "URL부터 물어본 뒤 무조건
// 켜기"가 필요한 경우엔 mode:"on"을 강제로 넘겨요. attrs는 켤 때 새로
// 만드는 태그에 얹을 속성(링크의 href 등)이에요.
export function applyMarkAcrossBlocks(tagName, blocks, { mode, attrs } = {}) {
  const localRanges = getLocalRanges(blocks);
  if (!localRanges) return;

  const turnOn = mode ?? !isMarkActiveAcrossBlocks(tagName, blocks);

  blocks.forEach(({ rootEl }, i) => {
    const range = localRanges[i];
    if (range.collapsed) return; // 이 블록 안엔 실제로 선택된 글자가 없어요.

    if (turnOn) {
      const existing = getAncestorTagForRange(range, tagName, rootEl);
      if (!existing) {
        const el = document.createElement(tagName);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        el.appendChild(range.extractContents());
        range.insertNode(el);
      }
    } else {
      const existing = getAncestorTagForRange(range, tagName, rootEl);
      if (existing) {
        const parent = existing.parentNode;
        if (parent) {
          while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
          parent.removeChild(existing);
        }
      }
    }
    rootEl?.dispatchEvent(new Event("input", { bubbles: true }));
  });

  window.getSelection()?.removeAllRanges();
}


// 선택한 글자에 인라인 글자색(attr="data-c") 또는 배경색(attr="data-bg")을 입히거나(key가 색 이름) 지워요(key가 null).
// 이미 다른 색이 걸린 구간이 섞여 있어도 되도록, 선택 구간의 글자 노드를 하나씩 색 span에서 "분리"한 뒤
// 그 노드만 새 색으로 바꿔요. blocks는 { rootEl } 배열(선택과 겹치는 블록들, 한 개여도 돼요).
export function applyInlineColor(blocks, attr, key) {
  const localRanges = getLocalRanges(blocks);
  if (!localRanges) return;

  const isolate = (textNode, anc) => {
    const before = document.createRange();
    before.setStart(anc, 0);
    before.setEndBefore(textNode);
    if (!before.collapsed) {
      const clone = anc.cloneNode(false);
      clone.appendChild(before.extractContents());
      anc.parentNode.insertBefore(clone, anc);
    }
    const after = document.createRange();
    after.setStartAfter(textNode);
    after.setEnd(anc, anc.childNodes.length);
    if (!after.collapsed) {
      const clone = anc.cloneNode(false);
      clone.appendChild(after.extractContents());
      anc.parentNode.insertBefore(clone, anc.nextSibling);
    }
  };

  blocks.forEach(({ rootEl }, i) => {
    const range = localRanges[i];
    if (!rootEl || range.collapsed) return;

    // 1) 선택 경계에서 글자 노드를 잘라 선택 구간이 온전한 글자 노드들로만 이뤄지게 해요.
    const { startContainer, startOffset, endContainer, endOffset } = range;
    if (endContainer.nodeType === Node.TEXT_NODE && endOffset < endContainer.length) {
      endContainer.splitText(endOffset);
    }
    if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
      startContainer.splitText(startOffset);
    }
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    const targets = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data) continue;
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(n);
      const startsBeforeEnd = nodeRange.compareBoundaryPoints(Range.START_TO_END, range) > 0;
      const endsAfterStart = nodeRange.compareBoundaryPoints(Range.END_TO_START, range) < 0;
      if (startsBeforeEnd && endsAfterStart) targets.push(n);
    }

    // 2) 노드마다 같은 종류의 색 span 조상에서 분리한 뒤 색을 바꾸거나(조상 속성 교체) 새 span으로 감싸요.
    targets.forEach((n) => {
      let anc = n.parentElement;
      while (anc && anc !== rootEl && !(anc.tagName === "SPAN" && anc.hasAttribute(attr))) anc = anc.parentElement;
      if (anc && anc !== rootEl) {
        isolate(n, anc);
        if (key) anc.setAttribute(attr, key);
        else anc.removeAttribute(attr);
      } else if (key) {
        const span = document.createElement("span");
        span.setAttribute(attr, key);
        n.replaceWith(span);
        span.appendChild(n);
      }
    });

    // 3) 비어버린 서식 요소를 치우고 흩어진 글자 노드를 합쳐요.
    rootEl.querySelectorAll("span,b,i,u,s,code,a").forEach((el) => {
      if (!el.textContent) el.remove();
    });
    // 같은 색이 이어진 span은 하나로 합쳐요.
    rootEl.querySelectorAll("span").forEach((span) => {
      let next = span.nextSibling;
      while (
        next &&
        next.nodeType === Node.ELEMENT_NODE &&
        next.tagName === "SPAN" &&
        next.getAttribute("data-c") === span.getAttribute("data-c") &&
        next.getAttribute("data-bg") === span.getAttribute("data-bg")
      ) {
        while (next.firstChild) span.appendChild(next.firstChild);
        const after = next.nextSibling;
        next.remove();
        next = after;
      }
    });
    rootEl.normalize();
    rootEl.dispatchEvent(new Event("input", { bubbles: true }));
  });

  window.getSelection()?.removeAllRanges();
}
