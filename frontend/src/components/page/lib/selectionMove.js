// Shift+방향키로 "선택의 움직이는 쪽 끝(focus)"을 옮길 위치를 계산하는 함수들이에요.
// 블록마다 글자 영역이 따로라서 브라우저 기본 이동(Selection.modify)은 블록 경계에서 시작 지점으로 튀거나
// 두 줄씩 올라가요 — 워드프로세서·노션처럼 "같은 가로 위치(goal x)에서 정확히 한 줄", "블록 끝에서
// 한 번 더 누르면 이웃 블록으로" 움직이도록 직접 계산해요. 결과는 { node, offset }(Selection.extend에
// 그대로 넘기는 값)이고, 계산만 하고 선택은 건드리지 않아요.

const RICH = "[data-rich-block-id]";

export function richElOf(n) {
  const node = n && (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement);
  return node?.closest?.(RICH) || null;
}

function lineHeightOf(el) {
  const style = window.getComputedStyle(el);
  return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
}

// 요소 위의 위치(요소, offset)를 가장 가까운 글자 노드 위치로 바꿔요(없으면 null).
// 크롬은 선택 끝을 글자 노드가 아니라 요소 기준(예: 블록 맨 끝 = 블록 요소의 마지막 자식 뒤)으로 두기도 해서,
// 이 위치로는 화면 좌표(사각형)가 안 나와요.
function resolveToText(node, offset) {
  if (node.nodeType === Node.TEXT_NODE) return { node, offset };
  const firstTextIn = (root) => {
    if (root.nodeType === Node.TEXT_NODE) return root.data ? root : null;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) if (t.data) return t;
    return null;
  };
  const lastTextIn = (root) => {
    if (root.nodeType === Node.TEXT_NODE) return root.data ? root : null;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let t = w.nextNode(); t; t = w.nextNode()) if (t.data) last = t;
    return last;
  };
  for (let i = offset; i < node.childNodes.length; i += 1) {
    const t = firstTextIn(node.childNodes[i]);
    if (t) return { node: t, offset: 0 };
  }
  for (let i = Math.min(offset, node.childNodes.length) - 1; i >= 0; i -= 1) {
    const t = lastTextIn(node.childNodes[i]);
    if (t) return { node: t, offset: t.data.length };
  }
  return null;
}

// 선택 끝(focus)의 화면 위치(커서 모양 사각형). 비어 있는 블록처럼 사각형이 안 나오면 블록 첫 줄 위치로 대신해요.
function focusCaretRect(sel, rich) {
  const at = resolveToText(sel.focusNode, sel.focusOffset);
  if (at) {
    const r = document.createRange();
    try {
      r.setStart(at.node, at.offset);
      r.collapse(true);
      const found = Array.from(r.getClientRects()).find((x) => x.height > 0);
      if (found) return found;
    } catch {
      // 아래 대체 값으로.
    }
  }
  const er = rich.getBoundingClientRect();
  const lh = lineHeightOf(rich);
  return { left: er.left, right: er.left, top: er.top, bottom: er.top + lh, height: lh };
}

// 블록 글자의 첫 줄(atStart) / 마지막 줄의 화면 위치. 블록 상자에는 위아래 여백(padding)이 있을 수 있어서,
// "첫/마지막 줄인지"와 "이웃 블록의 어느 높이를 겨냥할지"는 상자가 아니라 실제 글자 줄 위치로 판단해요.
function edgeLineRect(rich, atStart) {
  const fake = { focusNode: rich, focusOffset: atStart ? 0 : rich.childNodes.length };
  return focusCaretRect(fake, rich);
}

function caretFromPoint(x, y) {
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

// 위/아래(up=true/false) 한 줄. goalXRef는 연속으로 누를 때 같은 가로 위치를 유지하려고 들고 있는 값이에요.
// 반환: { node, offset } | null(옮길 곳 없음).
export function computeVerticalTarget(sel, editorEl, up, goalXRef) {
  const rich = richElOf(sel.focusNode);
  if (!rich) return null;
  const rc0 = focusCaretRect(sel, rich);
  if (!rc0) return null;
  const all = Array.from(editorEl.querySelectorAll(RICH));
  const idx = all.indexOf(rich);

  // 직전에 우리가 옮긴 자리에서 이어서 누르는 거면 그때의 가로 위치를 그대로 써요(짧은 줄을 지나도 열이 유지돼요).
  const goal = goalXRef.current;
  const gx = goal && goal.node === sel.focusNode && goal.offset === sel.focusOffset ? goal.x : rc0.left;

  const plan = () => {
    const rc = focusCaretRect(sel, rich) || rc0;
    const lh = lineHeightOf(rich);
    const edge = edgeLineRect(rich, up);
    const onEdgeLine = Math.abs((rc.top + rc.bottom) / 2 - (edge.top + edge.bottom) / 2) < Math.max(rc.height, edge.height) * 0.5;
    if (!onEdgeLine) return { target: rich, y: up ? rc.top - lh * 0.5 : rc.bottom + lh * 0.5 };
    const neighbor = all[idx + (up ? -1 : 1)];
    if (!neighbor) return { target: null };
    // 이웃 블록의 가장 가까운 쪽 줄(위로 갈 땐 마지막 줄, 아래로 갈 땐 첫 줄) 한가운데.
    const nl = edgeLineRect(neighbor, !up);
    return { target: neighbor, y: (nl.top + nl.bottom) / 2 };
  };

  let p = plan();
  if (!p.target) {
    // 더 갈 곳이 없으면 이 블록의 맨 앞/맨 끝까지(워드프로세서와 같아요). 이때도 가로 위치는 기억해 둬서,
    // 다시 반대로 돌아오면 처음 커서가 있던 열로 돌아와요.
    goalXRef.current = { x: gx, pending: true };
    return { node: rich, offset: up ? 0 : rich.childNodes.length, toEdge: true };
  }
  // 화면 밖의 점은 caretFromPoint가 못 읽어서, 먼저 스크롤해서 보이게 한 뒤 다시 계산해요.
  if (p.y < 4 || p.y > window.innerHeight - 4) {
    p.target.scrollIntoView({ block: "nearest" });
    p = plan();
  }
  const tr = p.target.getBoundingClientRect();
  const x = Math.min(Math.max(gx, tr.left + 1), tr.right - 1);
  const pos = caretFromPoint(x, p.y);
  let result = pos && richElOf(pos.node) === p.target ? pos : null;
  if (!result) {
    // 점이 글자 위가 아니면(여백·목록 기호 등) 그 블록의 맨 앞/맨 끝으로.
    result = { node: p.target, offset: up ? p.target.childNodes.length : 0 };
  }
  goalXRef.current = { x: gx, pending: true };
  return result;
}

// 이동 직후 새 선택 끝 위치를 goal에 함께 기록해서, 다음 연속 입력이 같은 열을 유지하게 해요(선택 끝이 그 자리 그대로일 때만 유효해요).
export function recordGoalX(sel, goalXRef) {
  const g = goalXRef.current;
  if (!g || !g.pending) return;
  goalXRef.current = sel.focusNode ? { x: g.x, node: sel.focusNode, offset: sel.focusOffset } : null;
}

// 좌/우(back=true/false) 한 글자. 블록 맨 앞/맨 끝에서는 이웃 블록의 맨 끝/맨 앞으로 넘어가요(줄바꿈 한 칸).
// 반환: { node, offset, crossed } | null.
export function computeHorizontalTarget(sel, editorEl, back) {
  const rich = richElOf(sel.focusNode);
  if (!rich) return null;
  const r = document.createRange();
  r.selectNodeContents(rich);
  if (back) r.setEnd(sel.focusNode, sel.focusOffset);
  else r.setStart(sel.focusNode, sel.focusOffset);
  const atEdge = r.toString().replace(/​/g, "") === "";
  if (!atEdge) return { crossed: false };
  const all = Array.from(editorEl.querySelectorAll(RICH));
  const neighbor = all[all.indexOf(rich) + (back ? -1 : 1)];
  if (!neighbor) return null;
  return { node: neighbor, offset: back ? neighbor.childNodes.length : 0, crossed: true };
}

// 선택 범위에 실제로 걸친 "글자"만의 화면 경계(위·아래·왼쪽·오른쪽).
// range.getBoundingClientRect()는 통째로 선택된 블록의 상자(가로 전체)까지 포함해서, 서식 툴바를
// 글자 옆에 두려고 할 때 항상 에디터 맨 오른쪽 끝으로 잡혀요 — 그래서 글자 노드의 조각들만 모아서 계산해요.
export function selectionTextBounds(range, editorEl) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const richEls = Array.from(editorEl.querySelectorAll(RICH)).filter((el) => range.intersectsNode(el));
  for (const rich of richEls) {
    const walker = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.data || !range.intersectsNode(t)) continue;
      const r = document.createRange();
      r.selectNodeContents(t);
      if (t === range.startContainer) r.setStart(t, range.startOffset);
      if (t === range.endContainer) r.setEnd(t, range.endOffset);
      for (const rc of r.getClientRects()) {
        if (rc.width === 0 && rc.height === 0) continue;
        left = Math.min(left, rc.left);
        top = Math.min(top, rc.top);
        right = Math.max(right, rc.right);
        bottom = Math.max(bottom, rc.bottom);
      }
    }
  }
  if (left === Infinity) return null;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
