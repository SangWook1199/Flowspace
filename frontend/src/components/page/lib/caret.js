import { stripHtml, sanitizeInlineHtml } from "../RichTextInput";

// 요청: "콜아웃/인용을 노션처럼" — 블록이 콜아웃/인용 박스 안팎으로 들어가거나
// 나오면(Tab/Shift+Tab 등) React 트리에서 부모가 달라져서 그 줄이 새로
// 마운트돼요 — 포커스와 커서 위치가 사라지니, 바뀌기 직전 커서 위치(글자
// 오프셋)를 기억해뒀다가 다시 그려진 뒤에 같은 자리로 되돌려요.
export function captureCaretOffset(el) {
  if (!el) return null;
  if (typeof el.selectionStart === "number") return el.selectionStart;
  const sel = window.getSelection();
  if (!el.isContentEditable || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.setEnd(sel.anchorNode, sel.anchorOffset);
  return range.toString().length;
}

export function restoreCaretOffset(el, offset) {
  el.focus();
  if (typeof el.setSelectionRange === "function") {
    el.setSelectionRange(offset, offset);
    return;
  }
  if (!el.isContentEditable) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  const range = document.createRange();
  while (node) {
    if (remaining <= node.nodeValue.length) {
      range.setStart(node, remaining);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    remaining -= node.nodeValue.length;
    node = walker.nextNode();
  }
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

// ===== 키보드 편집용 커서 유틸 (Enter 분할 / Backspace 병합 / 방향키 이동 / 붙여넣기) =====

// caretRangeFromPoint가 글자가 아니라 요소 자체(예: DIV, offset 0)를 가리킬 때가 있어요 —
// 그러면 커서 위치(rect)를 못 구해서 다음 ↑/↓ 판정이 어긋나요. 가장 가까운 글자 노드 안의
// 위치로 옮겨줘요(글자가 하나도 없으면 그대로 돌려줘요).
export function normalizeRangeIntoText(range, el) {
  if (range.startContainer.nodeType === 3) return range;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let last = null;
  while (node) {
    last = node;
    if (range.comparePoint(node, 0) >= 0) {
      const r = document.createRange();
      r.setStart(node, 0);
      r.collapse(true);
      return r;
    }
    node = walker.nextNode();
  }
  if (!last) return range;
  const r = document.createRange();
  r.setStart(last, last.nodeValue.length);
  r.collapse(true);
  return r;
}

// 커서(또는 선택)를 기준으로 contentEditable 블록의 HTML을 "앞부분/뒷부분"으로 나눠요.
// 선택 영역이 있으면 먼저 그 부분을 지운 뒤 나눠요(노션에서 글자를 선택하고 Enter를
// 치면 선택한 글자가 사라지고 줄이 나뉘는 것과 같아요). Range.cloneContents는 잘린
// 서식 태그(<b> 등)를 양쪽에 똑같이 복제해줘서, 굵은 글씨 한가운데서 나눠도 양쪽 다
// 굵게 유지돼요.
// Range가 가리키는 조각을 (블록에 저장하는 것과 같은 형태의) 안전한 인라인 HTML로 바꿔요.
// 나누면서 내용이 비어버린 서식 태그(<b></b> 등)는 걷어내요.
export function serializeRangeHtml(r) {
  const box = document.createElement("div");
  box.appendChild(r.cloneContents());
  let html = box.innerHTML;
  let prevHtml;
  do {
    prevHtml = html;
    html = html.replace(/<(b|i|u|s|strong|em|strike|code|a|span)(\s[^>]*)?><\/\1>/gi, "");
  } while (html !== prevHtml);
  return sanitizeInlineHtml(html);
}

export function splitContentAtCaret(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0);
  // 선택 영역이 있으면 "선택 앞부분"과 "선택 뒷부분"만 남겨요(=선택을 지운 것과 같아요). 화면(DOM)은 건드리지
  // 않아요 — 예전엔 range.deleteContents()로 실제 DOM을 지웠는데 저장된 값(state)은 그대로라 화면과 어긋났어요.
  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(el);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const afterRange = document.createRange();
  afterRange.selectNodeContents(el);
  afterRange.setStart(range.endContainer, range.endOffset);
  return { before: serializeRangeHtml(beforeRange), after: serializeRangeHtml(afterRange) };
}

// 여러 블록에 걸친 선택(range)을 지울 때 남는 조각: 선택이 시작된 블록(startEl)의 선택 앞부분(head)과
// 끝난 블록(endEl)의 선택 뒷부분(tail). 선택 경계가 해당 블록 밖(사이 여백 등)이면 그쪽은 빈 문자열이에요.
// headLength는 head의 글자 수(합친 뒤 커서를 놓을 자리)예요.
export function sliceBlocksAroundRange(startEl, endEl, range) {
  let head = "";
  let headLength = 0;
  if (startEl.contains(range.startContainer)) {
    const r = document.createRange();
    r.selectNodeContents(startEl);
    r.setEnd(range.startContainer, range.startOffset);
    head = serializeRangeHtml(r);
    headLength = r.toString().length;
  }
  let tail = "";
  if (endEl.contains(range.endContainer)) {
    const r = document.createRange();
    r.selectNodeContents(endEl);
    r.setStart(range.endContainer, range.endOffset);
    tail = serializeRangeHtml(r);
  }
  return { head, tail, headLength };
}

// 커서가 (선택 없이) 블록 맨 앞/맨 뒤에 있는지.
export function isCaretAtEdge(el, edge) {
  if (typeof el.selectionStart === "number") {
    if (el.selectionStart !== el.selectionEnd) return false;
    return edge === "start" ? el.selectionStart === 0 : el.selectionStart === el.value.length;
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || !el.contains(sel.anchorNode)) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  if (edge === "start") range.setEnd(sel.anchorNode, sel.anchorOffset);
  else range.setStart(sel.anchorNode, sel.anchorOffset);
  return range.toString().length === 0 && (edge === "end" || true);
}

// 커서가 블록의 "첫 줄"/"마지막 줄"에 있는지 — 글자 위치(rect)로 판정해요. 여러 줄로
// 줄바꿈된 긴 문단 안에서는 브라우저 기본 ↑/↓가 줄 사이를 움직이게 두고, 첫/마지막
// 줄에서만 옆 블록으로 넘어가요. rect를 못 구하면 null(판정 불가 → 기본 동작).
export function getCaretVisualEdge(el) {
  if (typeof el.selectionStart === "number") {
    const value = el.value;
    if (el.selectionStart !== el.selectionEnd) return null;
    return {
      first: value.lastIndexOf("\n", el.selectionStart - 1) === -1 || el.selectionStart === 0,
      last: value.indexOf("\n", el.selectionStart) === -1,
      x: null,
    };
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || !el.contains(sel.anchorNode)) return null;
  const elRect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
  let rect = sel.getRangeAt(0).getClientRects()[0];
  if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) {
    if (stripHtml(el.innerHTML) !== "" ) return null;
    return { first: true, last: true, x: elRect.left };
  }
  return {
    first: rect.top - elRect.top < lineHeight * 0.7,
    last: elRect.bottom - rect.bottom < lineHeight * 0.7,
    x: rect.left,
  };
}

// el 안에서 가장 가까운 x/y 위치에 커서를 둬요(옆 블록으로 ↑/↓ 이동할 때 가로 위치
// 유지). caretRangeFromPoint가 엉뚱한 곳을 가리키면 처음/끝으로 대신해요.
export function placeCaretNearPoint(el, x, where) {
  if (typeof el.setSelectionRange === "function") {
    el.focus();
    const pos = where === "start" ? 0 : el.value.length;
    el.setSelectionRange(pos, pos);
    return;
  }
  el.focus();
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
  const y = where === "start" ? rect.top + lineHeight / 2 : rect.bottom - lineHeight / 2;
  // 이웃 블록이 들여쓰기돼 있거나 아이콘 옆이라 x가 블록 폭 밖일 수 있어서, 블록 폭 안으로 맞춰요.
  const cx = x == null ? null : Math.min(Math.max(x, rect.left + 1), Math.max(rect.left + 1, rect.right - 1));
  const range = cx == null ? null : document.caretRangeFromPoint?.(cx, y);
  const sel = window.getSelection();
  if (range && el.contains(range.startContainer)) {
    sel.removeAllRanges();
    sel.addRange(normalizeRangeIntoText(range, el));
    return;
  }
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(where === "start");
  sel.removeAllRanges();
  sel.addRange(normalizeRangeIntoText(r, el));
}

export function isEntireContentSelected(el) {
  if (!el) return false;
  if (typeof el.selectionStart === "number") {
    return el.selectionStart === 0 && el.selectionEnd === el.value.length;
  }
  const text = (el.textContent || "").replace(/\s/g, "");
  if (!text.length) return true;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return false;
  return sel.toString().replace(/\s/g, "") === text;
}
