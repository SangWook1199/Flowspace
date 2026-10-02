import { stripHtml } from "../RichTextInput";

// 블록 내용이 "비어있나"를 판정할 때, RICH_TEXT_TYPES 블록은 content가
// 더 이상 순수 문자열이 아니라 HTML이라(예: 다 지웠는데 서식 태그만
// 남는 경우) 태그를 걷어낸 실제 글자 기준으로 봐야 안전해요.
export function isBlockContentEmpty(content) {
  return stripHtml(content).trim() === "";
}

// 요청: "블록 중첩/들여쓰기" — blocks는 여전히 평평한 배열이고, 각
// 블록의 block.indent(0,1,2…)만으로 "몇 단 들여쓰기됐는지"를 나타내요.
// 어떤 블록의 "자식들"은 별도 필드로 저장하지 않고, 바로 뒤에서부터
// indent가 이 블록보다 큰 동안 이어지는 블록들로 암묵적으로 정의돼요
// (indent가 같거나 작은 블록이 나오면 거기서 끝). end는 배타적
// 인덱스라 list.slice(index, end)가 "이 블록 + 모든 자식/후손"이에요.
// 들여쓰기/내어쓰기(indentBlock/outdentBlock)와 복제(duplicateBlock/
// bulkDuplicateSelected)가 이 범위를 통째로 옮겨야 중첩 구조가 깨지지
// 않아서 공용으로 뽑아뒀어요.
export function getSubtreeRange(list, index) {
  const baseIndent = list[index]?.indent || 0;
  let end = index + 1;
  while (end < list.length && (list[end].indent || 0) > baseIndent) end += 1;
  return end;
}

// 요청: "노션같은 경우 들여쓰기를 하면 하위 블록이 되잖아 그럴경우
// 상위 블록을 이동하면 하위 블록도 같이 이동해 그리고 그상태에서
// 배경색이나 font를 바꾸거나 하면 상위, 하위 블록 다 편집이 돼 복제도
// 마찬가지" — 이동/삭제/색상 변경처럼 "이 블록에 적용한 조작을 자식
// 전체에도 그대로 적용"해야 하는 여러 곳(moveBlock, deleteBlock,
// setBlockColor, setBlockTextColor, 드래그 그룹 계산)에서 반복해서
// 필요한, getSubtreeRange의 결과를 id 배열로 바로 쓰는 짧은 헬퍼예요.
export function getSubtreeIds(list, index) {
  const end = getSubtreeRange(list, index);
  return list.slice(index, end).map((b) => b.id);
}

// 요청: "같은 부모의 형제 블록은 색 통일" — 색이 칠해진 블록의 바로
// 옆(같은 들여쓰기 단, 같은 부모) 형제가 색이 없으면 "중간만 하얀색"
// 처럼 끊겨 보여서 말이 안 된다는 피드백을 받고 추가한 헬퍼들이에요.
// findParentIndex는 거슬러 올라가며 처음 만나는 "이 블록보다 indent가
// 하나 작은" 블록을 부모로 찾아요(normalizeIndents가 항상 바로 앞
// 블록보다 최대 +1씩만 깊어지게 보장해주니, 거슬러 올라가다 처음
// 만나는 더 얕은 블록은 반드시 정확히 indent-1이에요). 최상위(indent 0)
// 블록은 부모가 없어서 -1을 돌려주고, 이 경우엔 "형제 통일" 규칙 대상이
// 아니에요 — 최상위 블록끼리는 스크린샷의 첫 줄/네번째 줄처럼 서로
// 독립적인 색을 가져도 정상이에요(부모를 공유하지 않으니까).
export function findParentIndex(list, index) {
  const indent = list[index]?.indent || 0;
  if (indent <= 0) return -1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if ((list[i].indent || 0) < indent) return i;
  }
  return -1;
}

// parentIndex 바로 아래 "직계 자식"들의 인덱스만 골라요(parentIndent + 1인
// 블록들 — 그보다 더 깊으면 그 자식의 자식이라 제외).
export function getDirectChildrenIndices(list, parentIndex) {
  const parentIndent = list[parentIndex]?.indent || 0;
  const end = getSubtreeRange(list, parentIndex);
  const result = [];
  for (let i = parentIndex + 1; i < end; i += 1) {
    if ((list[i].indent || 0) === parentIndent + 1) result.push(i);
  }
  return result;
}

// index가 속한 "형제 그룹"(자기 자신 포함) 전체의 인덱스 배열. 최상위
// 블록이면(부모가 없으면) null을 돌려줘서, 호출하는 쪽이 "형제 통일 규칙
// 적용 안 됨"을 쉽게 구분하게 해요.
export function getSiblingGroupIndices(list, index) {
  const parentIndex = findParentIndex(list, index);
  if (parentIndex === -1) return null;
  return getDirectChildrenIndices(list, parentIndex);
}

// 형제 그룹이 "지금 어떤 색이어야 하는지" 결정해요 — 부모 자신의 색을
// 최우선으로 따르고(부모 색이 곧 그 자식 그룹 전체의 색), 부모가 색이
// 없으면 형제들 중 먼저 나오는 색을 그대로 따라가요(들여쓰기/내어쓰기로
// 새로 합류할 때, 이미 색이 있는 기존 형제 쪽을 기준으로 맞추는 게
// 자연스러워요). 아무도 색이 없으면 null.
export function resolveGroupColor(list, parentIndex, siblingIndices) {
  if (parentIndex >= 0 && list[parentIndex]?.color) return list[parentIndex].color;
  for (const i of siblingIndices) {
    if (list[i]?.color) return list[i].color;
  }
  return null;
}

// 요청: "블록 중첩/들여쓰기" — 구조가 바뀌는 모든 변경(드래그, 삭제,
// 복제, 이동, 타입 변경…) 뒤에 이 함수로 indent를 "정상화"해요. 규칙은
// 노션과 같아요 — 어떤 블록도 바로 앞 블록의 indent + 1보다 더 깊게
// 들여쓰기될 수 없고(부모 없이 붕 뜬 상태 방지), 맨 첫 블록은 항상
// indent 0이에요. setBlocks 안에서 모든 변경에 자동으로 적용돼요(위
// setBlocks 주석 참고). 실제로 바뀐 게 없으면 원래 배열을 그대로
// 돌려줘서(변경 없음 → 새 배열 참조 안 만듦) 불필요한 리렌더를 늘리지
// 않아요.
export function normalizeIndents(list) {
  let prevIndent = 0;
  let changed = false;
  const next = list.map((b, i) => {
    const raw = b.indent || 0;
    const max = i === 0 ? 0 : prevIndent + 1;
    const indent = Math.min(raw, max);
    prevIndent = indent;
    if (indent === raw) return b;
    changed = true;
    return { ...b, indent };
  });
  return changed ? next : list;
}

// 요청: "블록 종류가 노션보다 적어요" — 토글 목록. 접힌(collapsed) 토글의
// 자식들(바로 뒤로 indent가 더 큰 블록들, getSubtreeRange와 똑같은
// 범위)은 배열에서 지우지 않고 그대로 두되, 화면에서만 숨겨요(데이터는
// 안전하게 남아있다가 다시 펼치면 그대로 보여요). 한 번의 순회로, "지금
// 이 블록보다 얕거나 같은 indent가 나올 때까지" 열려있는 접힌 조상들을
// 스택으로 들고 있다가, 스택에 접힌 조상이 하나라도 있으면 숨겨요 —
// 토글 안에 또 접힌 토글이 있어도(중첩) 정확히 동작해요.
export function computeHiddenBlockIds(list) {
  const hidden = new Set();
  const stack = []; // [{ indent, collapsed }] — 지금 "열려있는" 조상 체인
  list.forEach((block) => {
    const indent = block.indent || 0;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (stack.some((entry) => entry.collapsed)) hidden.add(block.id);
    stack.push({ indent, collapsed: block.type === "TOGGLE" && !!block.collapsed });
  });
  return hidden;
}

// 요청: "콜아웃/인용을 노션처럼" — 노션의 콜아웃과 인용은 "한 줄짜리 블록"이
// 아니라 안에 여러 블록(문단·목록·토글·이미지…)을 담는 컨테이너예요.
// 저장 구조는 그대로 평평한 배열 + block.indent 예요 — 콜아웃/인용 바로
// 뒤에서 indent가 더 큰 블록들(getSubtreeRange)이 곧 "박스 안의 블록들"이고,
// 화면에서만 그 범위를 하나의 박스(.block-container)로 감싸서 그려요.
export function isContainerBlock(block) {
  return !!block && (block.type === "CALLOUT" || block.type === "QUOTE");
}

// 블록마다 "어느 컨테이너 안에 있는지"(가장 가까운 콜아웃/인용의 인덱스, 없으면
// -1)를 한 번의 순회로 미리 계산해요 — 위/아래 블록과 색을 이어붙일지(blend)
// 결정할 때, 컨테이너 경계를 넘어선 이어붙이기를 막는 데 써요.
export function computeContainerOwners(list) {
  const owners = new Array(list.length).fill(-1);
  const stack = []; // [{ index, indent }] — 열려있는 컨테이너 체인
  list.forEach((block, i) => {
    const indent = block.indent || 0;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    owners[i] = stack.length ? stack[stack.length - 1].index : -1;
    if (isContainerBlock(block)) stack.push({ index: i, indent });
  });
  return owners;
}

// setBlockColor/setBlockTextColor가 색을 바꿀 블록 id 집합이에요. 보통은
// "같은 부모의 형제 + 각자의 자식들 전체"인데, 콜아웃/인용은 박스 자체가
// 독립된 덩어리라서 (1) 콜아웃/인용 자기 자신의 색은 자기 하나만 바꾸고
// (박스 안 블록들은 그대로), (2) 콜아웃/인용 "안에 있는" 블록은 형제 통일
// 대신 자기 + 자기 자식들만 바꿔요.
export function collectColorTargetIds(list, index) {
  if (isContainerBlock(list[index])) return new Set([list[index].id]);
  const parentIndex = findParentIndex(list, index);
  if (parentIndex !== -1 && isContainerBlock(list[parentIndex])) {
    return new Set(getSubtreeIds(list, index));
  }
  const siblingIndices = getSiblingGroupIndices(list, index) || [index];
  const ids = new Set();
  siblingIndices.forEach((i) => getSubtreeIds(list, i).forEach((bid) => ids.add(bid)));
  return ids;
}

// 선택된 블록들에 "각자의 자식 전체"를 더한 id 집합. 부모만 선택돼 있어도(Escape로 커서
// 있는 블록 선택 등) 삭제·이동·복제는 항상 하위 블록까지 한 덩어리로 다뤄야 구조가 안 깨져요.
export function expandSelectionWithSubtrees(list, selectedIds) {
  const expanded = new Set(selectedIds);
  list.forEach((b, i) => {
    if (selectedIds.has(b.id)) getSubtreeIds(list, i).forEach((id) => expanded.add(id));
  });
  return expanded;
}

// 요청: "블록 중첩/들여쓰기" — 들여쓰기가 생기면서, 번호 매기기 목록도
// 노션처럼 "단(indent)마다 자기 번호"를 가져야 해요(예: 1번 항목 아래
// 들여쓴 하위 목록은 다시 1부터 시작하고, 그 하위 목록이 끝나면 바깥
// 목록은 2부터 이어져요). indent별로 counters[level]에 각자 카운터를
// 두고, 그보다 더 깊은 단의 카운터는 그 단에서 뭔가(번호든 아니든)
// 새로 나올 때마다 초기화해요 — 그래야 다른 부모 밑에서 새로 시작하는
// 하위 목록이 이전 하위 목록의 번호를 이어받지 않아요.
// 번호 목록 표시 형식은 노션처럼 단계마다 달라요: 1단 "1.", 2단 "a.", 3단 "i.", 그 아래는 다시 반복.
export function formatListNumber(n, level) {
  const kind = level % 3;
  if (kind === 1) {
    let x = n;
    let out = "";
    while (x > 0) {
      x -= 1;
      out = String.fromCharCode(97 + (x % 26)) + out;
      x = Math.floor(x / 26);
    }
    return `${out || "a"}.`;
  }
  if (kind === 2) {
    const map = [
      [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
      [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
    ];
    let x = n;
    let out = "";
    for (const [v, sym] of map) {
      while (x >= v) {
        out += sym;
        x -= v;
      }
    }
    return `${out || "i"}.`;
  }
  return `${n}.`;
}

export function computeNumbers(blocks) {
  const numbers = [];
  const counters = {};

  blocks.forEach((block) => {
    const indent = block.indent || 0;

    Object.keys(counters).forEach((level) => {
      if (Number(level) > indent) delete counters[level];
    });

    if (block.type === "NUMBERED") {
      counters[indent] = (counters[indent] || 0) + 1;
      numbers.push(counters[indent]);
    } else {
      delete counters[indent];
      numbers.push(0);
    }
  });

  return numbers;
}
