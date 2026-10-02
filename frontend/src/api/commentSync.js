import * as commentApi from "./comments";

// 블록 댓글을 서버와 맞춰요(블록 저장이 끝나 서버 블록 id가 정해진 뒤에 불러요).
// state: 블록 id(문자열) → { blockId, comments: Map(에디터 댓글 id → { sid(서버 댓글 id), text }) }
// 에디터의 새 댓글은 서버에 만들고, 글이 바뀐 댓글은 수정하고, 사라진 댓글은 지워요.
export async function syncComments(state, snapshot, idMap) {
  const alive = new Set(snapshot.map((b) => String(b.id)));
  for (const cid of [...state.keys()]) if (!alive.has(cid)) state.delete(cid);

  for (const block of snapshot) {
    const cid = String(block.id);
    const blockId = idMap.get(cid);
    const editor = block.comments ?? [];
    if (blockId == null) continue;

    let entry = state.get(cid);
    // 같은 에디터 블록이 서버에서 새 블록이 됐으면(타입 변경 등) 옛 댓글은 같이 사라졌으니 처음부터 다시 만들어요.
    if (entry && entry.blockId !== blockId) entry = null;
    if (!entry) {
      if (editor.length === 0) continue;
      entry = { blockId, comments: new Map() };
    }
    state.set(cid, entry);

    const editorIds = new Set(editor.map((c) => c.id));
    for (const [eid, rec] of [...entry.comments]) {
      if (editorIds.has(eid)) continue;
      await commentApi.deleteComment(rec.sid);
      entry.comments.delete(eid);
    }

    for (const c of editor) {
      const rec = entry.comments.get(c.id);
      if (!rec) {
        const res = await commentApi.createBlockComment(blockId, c.text);
        entry.comments.set(c.id, { sid: res.commentId, text: res.content });
      } else if (rec.text !== c.text) {
        const res = await commentApi.updateComment(rec.sid, c.text);
        rec.text = res.content;
      }
    }

    if (entry.comments.size === 0) state.delete(cid);
  }
}

// 불러온 서버 블록들의 댓글로 처음 상태를 만들어요(에디터 댓글 id가 서버 댓글 id와 같아요).
export function commentStateFromServer(serverBlocks, toFlat) {
  const state = new Map();
  for (const b of serverBlocks) {
    const flat = toFlat(b.comments);
    if (flat.length > 0) {
      state.set(String(b.blockId), {
        blockId: b.blockId,
        comments: new Map(flat.map((c) => [c.id, { sid: c.id, text: c.text }])),
      });
    }
  }
  return state;
}
