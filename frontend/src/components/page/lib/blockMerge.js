// 다른 멤버가 저장한 페이지(remote)를 내 화면(local)에 합치는 "블록 단위 3자 병합"이에요.
//   base   = 내가 마지막으로 서버와 맞춰본 상태(불러왔거나 내가 저장한 직후)
//   local  = 지금 내 화면
//   remote = 서버에 있는 최신 상태
// 규칙: 내가 base 이후로 고친 블록은 내 것이 이기고, 안 고친 블록은 서버 것을 가져와요.
//       서버에 새로 생긴 블록은 추가하고, 서버에서 지워진 블록은(내가 안 고쳤다면) 같이 지워요.
// 아무 것도 바뀌지 않으면 local 배열을 그대로(같은 참조) 돌려줘서 화면이 다시 그려지지 않아요.
//
// sig(block): 저장되는 내용이 같은지 비교하는 문자열(들여쓰기·순서는 뺀 블록 내용).
const idOf = (block) => String(block.id);

const indentOf = (block) => block.indent || 0;

export function mergeBlocks({ base, local, remote, sig }) {
  const baseMap = new Map(base.map((b) => [idOf(b), b]));
  const localMap = new Map(local.map((b) => [idOf(b), b]));
  const remoteMap = new Map(remote.map((b) => [idOf(b), b]));

  const changedSince = (block, id) => {
    const original = baseMap.get(id);
    return !original || sig(block) !== sig(original);
  };

  // 어느 블록을 남길지
  const keep = new Set();
  for (const id of new Set([...localMap.keys(), ...remoteMap.keys()])) {
    const lb = localMap.get(id);
    const rb = remoteMap.get(id);

    if (lb && rb) keep.add(id);
    else if (lb) {
      // 서버에서 지워졌어요 — 내가 안 고쳤으면 같이 지워요(새로 만든 블록은 base에 없어서 남아요).
      if (!baseMap.has(id) || changedSince(lb, id)) keep.add(id);
    } else if (rb) {
      // 내가 지웠어요 — 서버에서 그 사이 고쳐졌다면 살려요. 서버에 새로 생긴 블록은 추가해요.
      if (!baseMap.has(id) || changedSince(rb, id)) keep.add(id);
    }
  }

  // 순서: 내가 base 이후로 순서를 바꿨으면 내 순서를, 아니면 서버 순서를 뼈대로 삼고 나머지를 끼워 넣어요.
  const baseIds = base.map(idOf);
  const localCommon = local.map(idOf).filter((id) => baseMap.has(id) && localMap.has(id));
  const baseCommon = baseIds.filter((id) => localMap.has(id));
  const localReordered = localCommon.join(",") !== baseCommon.join(",");

  const primary = (localReordered ? local : remote).map(idOf);
  const secondary = (localReordered ? remote : local).map(idOf);

  const order = primary.filter((id) => keep.has(id));
  const placed = new Set(order);

  secondary.forEach((id, index) => {
    if (placed.has(id) || !keep.has(id)) return;
    let at = 0;
    for (let i = index - 1; i >= 0; i -= 1) {
      const found = order.indexOf(secondary[i]);
      if (found !== -1) {
        at = found + 1;
        break;
      }
    }
    order.splice(at, 0, id);
    placed.add(id);
  });

  const merged = order.map((id) => {
    const lb = localMap.get(id);
    const rb = remoteMap.get(id);
    if (!lb) return rb;
    if (!rb) return lb;

    // 데이터베이스 블록은 내용을 여기서 합치지 않아요(내 것을 그대로 둬요).
    const takeRemote = lb.type !== "DATABASE" && !changedSince(lb, id) && changedSince(rb, id);
    const picked = takeRemote ? rb : lb;

    // 들여쓰기: 내가 바꿨으면 내 것, 아니면 서버 것
    const original = baseMap.get(id);
    const indent = original && indentOf(lb) !== indentOf(original) ? indentOf(lb) : indentOf(rb);
    if (indentOf(picked) === indent) return picked;

    const next = { ...picked };
    if (indent > 0) next.indent = indent;
    else delete next.indent;
    return next;
  });

  const unchanged = merged.length === local.length && merged.every((block, i) => block === local[i]);
  return unchanged ? local : merged;
}
