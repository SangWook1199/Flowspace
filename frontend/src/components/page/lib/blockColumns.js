import { getSubtreeRange } from "./blockTree.js";

// "열" 블록(노션의 2열·3열) — 저장 구조는 다른 블록과 똑같이 평평한 배열 + block.indent 예요.
//
//   COLUMN_LIST   (indent d)      열 묶음. 화면에서는 가로로 나란히 놓인 박스 하나로 그려져요.
//     COLUMN      (indent d+1)    열 하나. block.width(비율)만 갖고, 안에 들어간 블록들이 그 아래 d+2 단으로 이어져요.
//       블록들     (indent d+2…)   열 안의 내용(문단·목록·이미지·콜아웃 … 뭐든지)
//     COLUMN      (indent d+1)
//       …
//
// COLUMN_LIST와 COLUMN은 글자를 쓰는 줄이 아니라 "구조"만 나타내는 블록이라 화면에 한 줄로 그려지지 않아요
// (BlockEditor의 renderRange가 열 상자로만 그려요). 노션처럼 열 묶음은 열이 2개 이상이어야 하고, 열은 비어 있으면 안 돼요.
// 이 규칙은 아래 normalizeColumns가 setBlocks 한 곳에서 항상 지켜줘서, 삭제·이동·들여쓰기·붙여넣기 같은 어떤 조작을 해도
// (예: 열 안의 블록을 다 지워도 빈 문단이 남고, 열이 하나만 남으면 열 묶음이 풀려요) 구조가 깨지지 않아요.

export const COLUMN_LIST = "COLUMN_LIST";
export const COLUMN = "COLUMN";

// 슬래시 메뉴 전용 키(저장되는 type은 COLUMN_LIST/COLUMN이에요 — TABLE·CHILD_PAGE와 같은 방식).
export const COLUMN_MENU_TYPES = ["COLUMNS_2", "COLUMNS_3"];
export const isColumnMenuType = (type) => COLUMN_MENU_TYPES.includes(type);

export const MAX_COLUMNS = 5;

export const isColumnStructure = (block) => !!block && (block.type === COLUMN_LIST || block.type === COLUMN);

const indentOf = (block) => block.indent || 0;

const shifted = (blocks, delta) =>
  blocks.map((b) => {
    const indent = Math.max(0, indentOf(b) + delta);
    if (indent === indentOf(b)) return b;
    const next = { ...b };
    if (indent > 0) next.indent = indent;
    else delete next.indent;
    return next;
  });

const withIndent = (block, indent) => {
  const next = { ...block };
  if (indent > 0) next.indent = indent;
  else delete next.indent;
  return next;
};

const emptyText = (id, indent) => ({ id, type: "TEXT", content: "", richText: true, ...(indent > 0 ? { indent } : {}) });

// 열 묶음 하나를 새로 만들어요: [COLUMN_LIST, COLUMN, 빈 문단, COLUMN, 빈 문단, …]. firstBlock을 주면 첫 열의 빈 문단 자리에 그 블록을 넣어요.
export function createColumnLayout(count, indent, makeId, firstBlock = null) {
  const list = { id: makeId(), type: COLUMN_LIST, ...(indent > 0 ? { indent } : {}) };
  const out = [list];
  for (let c = 0; c < count; c += 1) {
    out.push({ id: makeId(), type: COLUMN, width: null, indent: indent + 1 });
    out.push(c === 0 && firstBlock ? withIndent(firstBlock, indent + 2) : emptyText(makeId(), indent + 2));
  }
  return out;
}

// 각 블록이 속한 "가장 가까운 열(COLUMN)"의 id (없으면 null). 열 안/밖을 구분할 때 써요.
export function computeColumnOwners(list) {
  const owners = new Array(list.length).fill(null);
  const stack = []; // [{ id, indent }]
  list.forEach((block, i) => {
    const indent = indentOf(block);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    owners[i] = stack.length ? stack[stack.length - 1].id : null;
    if (block.type === COLUMN) stack.push({ id: block.id, indent });
  });
  return owners;
}

// 구조가 규칙에 어긋난 곳을 고쳐서 돌려줘요(바뀐 게 없으면 같은 배열 참조). makeId: 빈 문단을 채울 때 쓰는 새 id 생성기.
//  - COLUMN_LIST의 직계 자식은 COLUMN뿐이에요. 다른 블록이 끼어들면 앞 열의 끝(앞 열이 없으면 첫 열의 맨 앞)으로 넣어요.
//  - 열이 비면 빈 문단을 하나 넣어요.
//  - 열이 1개뿐이면 열 묶음을 풀고(내용은 그 자리에 그대로), 0개면 묶음만 없애요.
//  - 열 안에 들어간 COLUMN_LIST는 풀어서 내용만 바깥 열에 남겨요(중첩 금지).
//  - COLUMN_LIST 밖에 있는 COLUMN은 없애요(안의 내용은 한 단 내어써요).
//  - 열 묶음이 맨 끝이면 그 뒤에 빈 문단을 하나 둬서, 열 아래에도 글을 쓸 수 있게 해요.
// 항상 normalizeIndents(들여쓰기가 앞 블록보다 2단 이상 깊어지지 않게)를 거친 배열을 받는다고 가정해요.
export function normalizeColumns(list, makeId) {
  if (!list.some(isColumnStructure)) return list;

  let out = list.slice();
  let changed = false;

  for (let i = 0; i < out.length; i += 1) {
    const block = out[i];

    if (block.type === COLUMN) {
      // 부모가 COLUMN_LIST가 아닌 열(고아)은 없애고 안의 내용을 한 단 내어써요.
      let parent = -1;
      for (let j = i - 1; j >= 0; j -= 1) {
        if (indentOf(out[j]) < indentOf(block)) {
          parent = j;
          break;
        }
      }
      const parentOk = parent !== -1 && out[parent].type === COLUMN_LIST && indentOf(out[parent]) === indentOf(block) - 1;
      if (!parentOk) {
        const end = getSubtreeRange(out, i);
        out.splice(i, end - i, ...shifted(out.slice(i + 1, end), -1));
        changed = true;
        i -= 1;
      }
      continue;
    }

    if (block.type !== COLUMN_LIST) continue;

    const d = indentOf(block);
    const end = getSubtreeRange(out, i);
    // 열 안에 또 열 묶음을 넣을 수 없어요(노션도 마찬가지). 붙여넣기·병합으로 생기면 묶음만 풀고 내용은 바깥 열에 그대로 둬요.
    const nested = computeColumnOwners(out)[i] != null;

    // 직계 자식 덩어리(자식 + 그 자손)로 나눠요.
    const units = [];
    for (let j = i + 1; j < end; ) {
      const e = Math.min(getSubtreeRange(out, j), end);
      units.push({ isColumn: out[j].type === COLUMN && indentOf(out[j]) === d + 1, blocks: out.slice(j, e) });
      j = e;
    }

    const columns = [];
    let leading = []; // 첫 열이 나오기 전에 끼어든 블록들
    for (const unit of units) {
      if (unit.isColumn) {
        columns.push({ head: unit.blocks[0], body: unit.blocks.slice(1) });
      } else {
        const moved = shifted(unit.blocks, d + 2 - indentOf(unit.blocks[0]));
        if (columns.length) columns[columns.length - 1].body.push(...moved);
        else leading = leading.concat(moved);
      }
    }

    let replacement;
    if (nested) {
      const flat = leading.concat(...columns.map((c) => c.body));
      replacement = flat.length ? shifted(flat, d - indentOf(flat[0])) : [];
    } else if (columns.length === 0) {
      replacement = leading.length ? shifted(leading, d - indentOf(leading[0])) : [];
    } else if (columns.length === 1) {
      const body = leading.concat(columns[0].body);
      replacement = body.length ? shifted(body, d - indentOf(body[0])) : [emptyText(makeId(), d)];
    } else {
      if (leading.length) columns[0].body = leading.concat(columns[0].body);
      replacement = [block];
      for (const column of columns) {
        const body = column.body.length ? column.body : [emptyText(makeId(), d + 2)];
        replacement.push(column.head, ...body);
      }
    }

    const same =
      replacement.length === end - i && replacement.every((b, k) => b === out[i + k]);
    if (!same) {
      out.splice(i, end - i, ...replacement);
      changed = true;
    }
    // 한 번 고친 묶음의 안쪽(중첩된 묶음)도 이어서 살펴보도록 i+1부터 계속해요.
  }

  // 열 묶음이 페이지 맨 끝이면 그 아래에 글 쓸 자리를 하나 둬요.
  const last = out[out.length - 1];
  if (last) {
    let top = out.length - 1;
    while (top > 0 && indentOf(out[top]) > 0) top -= 1; // 맨 끝 블록이 속한 최상위 블록
    if (out[top].type === COLUMN_LIST && getSubtreeRange(out, top) === out.length) {
      out.push(emptyText(makeId(), indentOf(out[top])));
      changed = true;
    }
  }

  return changed ? out : list;
}
