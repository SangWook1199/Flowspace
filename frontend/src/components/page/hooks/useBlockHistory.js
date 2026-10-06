import { useRef } from "react";

// 블록 편집기의 실행 취소/다시 실행(Ctrl+Z / Ctrl+Y) 기록을 관리하는 훅이에요.
//
// - 블록 구조가 바뀌는 조작(복제·삭제·이동·드래그 등)은 직접 pushUndoSnapshot()을 불러요.
// - 글자 입력은 pushTextUndoSnapshot()으로, 같은 블록에서 1초 안에 이어진 입력을 한 덩어리로 묶어요.
// - 스냅샷은 최대 MAX_HISTORY개까지만 들고 있어요.
//
// blocks / 반환 함수들은 매 렌더마다 새로 만들어져서 항상 "가장 최근 blocks"를 봐요(이전
// BlockEditor 안에 있을 때와 같은 방식).
// onRestore(target, focusId, oldIndex): 스냅샷을 되돌린 직후 호출돼요 — 선택·메뉴 정리와 커서
// 이동처럼 편집기 쪽 상태가 필요한 일을 거기서 해요.
const MAX_HISTORY = 50;

export default function useBlockHistory({ blocks, setBlocksState, onRestore }) {
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  // 같은 블록에서 1초 안에 이어진 입력은 스냅샷을 새로 안 쌓아요(마지막 입력 시각 기억).
  const lastTextUndoRef = useRef({ id: null, time: 0 });

  // 가장 최근에 쌓은 스냅샷 기록 — 그 조작이 결국 아무것도 안 바꿨으면 스냅샷을 도로 거둬요(revertSnapshot).
  const lastPushRef = useRef(null);

  const pushUndoSnapshot = () => {
    const rec = { snapshot: blocks, redo: redoStackRef.current, trimmed: undefined, reverted: false };
    undoStackRef.current.push(blocks);
    if (undoStackRef.current.length > MAX_HISTORY) rec.trimmed = undoStackRef.current.shift();
    lastPushRef.current = rec;
    // 새 변경이 생기면 "다시 실행" 기록은 의미가 없어져요.
    redoStackRef.current = [];
    // 구조 변경이 끼어들면 그 앞뒤의 글자 입력은 다른 덩어리예요.
    lastTextUndoRef.current = { id: null, time: 0 };
  };

  // 첫 블록에서 Tab, 맨 위 블록에서 Shift+Tab처럼 눌러도 아무것도 안 바뀐 조작은 "되돌릴 게 없는" 기록이에요.
  // 그런 기록이 쌓이면 Ctrl+Z가 아무 변화 없이 한 번 소모되고 다시 실행(Ctrl+Y) 기록까지 지워져요 —
  // 그래서 변경이 없었다고 확인되면 방금 쌓은 스냅샷을 빼고 지워졌던 다시 실행 기록도 되돌려요.
  const revertSnapshot = (rec) => {
    if (!rec || rec.reverted) return;
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] !== rec.snapshot) return;
    rec.reverted = true;
    stack.pop();
    if (rec.trimmed !== undefined) stack.unshift(rec.trimmed);
    redoStackRef.current = rec.redo;
  };

  const pushTextUndoSnapshot = (blockId, force = false) => {
    const now = Date.now();
    const last = lastTextUndoRef.current;
    if (!force && last.id === blockId && now - last.time < 1000) {
      lastTextUndoRef.current = { id: blockId, time: now };
      return;
    }
    pushUndoSnapshot();
    lastTextUndoRef.current = { id: blockId, time: now };
  };

  // focusId: 되돌리기 직전에 커서가 있던 블록 — 되돌린 뒤에도 남아있으면 거기로, 사라졌다면
  // (예: 방금 Enter로 만든 블록) 그 바로 위 블록으로 커서를 보내요(onRestore가 처리).
  const restoreBlocksSnapshot = (target, focusId) => {
    const oldIndex = blocks.findIndex((b) => b.id === focusId);
    setBlocksState(target);
    lastTextUndoRef.current = { id: null, time: 0 };
    onRestore?.(target, focusId, oldIndex);
  };

  const handleUndo = (focusId = null) => {
    const prevBlocks = undoStackRef.current.pop();
    if (prevBlocks === undefined) return;
    redoStackRef.current.push(blocks);
    restoreBlocksSnapshot(prevBlocks, focusId);
  };

  const handleRedo = (focusId = null) => {
    const nextBlocks = redoStackRef.current.pop();
    if (nextBlocks === undefined) return;
    undoStackRef.current.push(blocks);
    restoreBlocksSnapshot(nextBlocks, focusId);
  };

  // 다른 멤버의 변경을 합칠 때 쌓아 둔 스냅샷에도 같은 변경을 반영해요(rebase: 스냅샷 → 합친 스냅샷).
  // 안 하면 undo/redo가 옛 스냅샷으로 되돌리면서 그 사이 다른 멤버가 추가한 블록이 사라져요.
  const rebaseHistory = (rebase) => {
    undoStackRef.current = undoStackRef.current.map(rebase);
    redoStackRef.current = redoStackRef.current.map(rebase);
    lastPushRef.current = null;
  };

  return { pushUndoSnapshot, pushTextUndoSnapshot, handleUndo, handleRedo, lastPushRef, revertSnapshot, rebaseHistory };
}
