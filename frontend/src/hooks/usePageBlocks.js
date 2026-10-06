import { useCallback, useEffect, useRef, useState } from "react";
import { deleteBlockImage, getPageDetail, syncBlocks, uploadBlockImage } from "../api/blocks";
import { getDatabaseDetail } from "../api/databases";
import { bindingFromLoaded, createBinding, syncDatabase } from "../api/databaseSync";
import { collectServerImages, syncKey, toEditorBlocks, toEditorComments, toEditorDatabase, toSyncItems } from "../api/mappers";
import { commentStateFromServer, syncComments } from "../api/commentSync";
import { mergeBlocks } from "../components/page/lib/blockMerge.js";
import { normalizeBlockShape } from "../components/page/lib/blockFactory.js";
import { normalizeIndents } from "../components/page/lib/blockTree.js";
import { getErrorMessage } from "../utils/apiError";

// 블록을 고치고 나서 서버에 보내기까지 기다리는 시간(타이핑 중 요청 폭주 방지).
const BLOCK_SAVE_DELAY_MS = 800;

const blankBlocks = () => [{ id: 1, type: "TEXT", content: "" }];
const isLocalUrl = (url) => /^(data:|blob:)/i.test(url ?? "");

// 실시간 반영이 이상할 때 켜는 로그: 개발자 도구 콘솔에서 localStorage.setItem("flowspace:debug-sync", "1") 실행 후 새로고침.
const debugSync = (...args) => {
  try {
    if (localStorage.getItem("flowspace:debug-sync")) console.info("[실시간]", ...args);
  } catch {
    // 저장소를 못 읽어도 동작에는 영향 없어요.
  }
};

// 블록 하나의 "저장되는 내용"을 비교용 문자열로 만들어요(들여쓰기·순서·서버 id는 빼요). 병합에서 "고쳤는지"를 가려요.
const SIG_CTX = { idMap: new Map(), dbBlockIds: { has: () => true }, synced: new Map() };
const blockSig = (block, resolvePageId) => {
  const [item] = toSyncItems([{ ...block, indent: 0 }], { ...SIG_CTX, resolvePageId });
  if (!item) return "";
  const { clientId, blockId, parentClientId, ...rest } = item; // eslint-disable-line no-unused-vars
  return JSON.stringify([rest, (block.comments ?? []).map((c) => [c.id, c.text])]);
};

// 페이지 하나의 블록을 서버에서 불러오고(GET /pages/{id}/detail), 고칠 때마다 통째로 맞춰요(PUT /pages/{id}/blocks).
//
//   const { status, error, blocks, onChange, saveState, retry, reload } = usePageBlocks(pageId, { getKnownPageIds, pageIdMap });
//
// - status: "loading" | "ready" | "error". ready가 되면 blocks를 BlockEditor의 초기 값으로 넘겨요.
// - onChange: BlockEditor의 onChange에 그대로 연결해요. 마지막 변경 뒤 잠깐 기다렸다가 한 번에 보내요.
// - saveState: "saved" | "saving" | "error". 실패하면 retry로 다시 보낼 수 있어요.
// - pageIdMap: 임시 페이지 id → 서버가 만든 실제 id. 하위 페이지 링크를 저장할 때 실제 id로 바꿔서 보내요.
// 에디터의 블록 id는 그대로 두고, 서버가 준 블록 id는 idMap에만 기억해요(블록 id를 바꾸면 에디터 상태가 꼬여요).
export function usePageBlocks(pageId, { getKnownPageIds, pageIdMap = {} } = {}) {
  const [load, setLoad] = useState({ status: "loading", error: null, blocks: null });
  const [saveState, setSaveState] = useState("saved");
  const [saveError, setSaveError] = useState(null);
  // 에디터 블록 id ↔ 서버 블록 id 대응이 바뀔 때마다(저장 직후·다른 멤버 변경을 받은 직후) 올라가요.
  const [idVersion, setIdVersion] = useState(0);

  const latest = useRef(null); // 에디터의 가장 최근 블록 배열
  const idMap = useRef(new Map()); // 에디터 블록 id(문자열) → 서버 blockId
  const dbBlockIds = useRef(new Set()); // 서버에서 데이터베이스인 블록의 blockId
  const synced = useRef(new Map()); // 서버가 이미지 파일을 가진 블록 id → 그때 에디터가 보여준 url
  const commentState = useRef(new Map()); // 블록 id(문자열) → 서버가 아는 댓글(commentSync)
  const bindings = useRef(new Map()); // 데이터베이스 블록 id(문자열) → 서버가 아는 데이터베이스 상태(databaseSync)
  const lastKey = useRef(null);
  // 서버와 마지막으로 맞춰본 블록들(불러왔거나 내가 저장한 직후, 또는 다른 멤버 변경을 받아온 직후) — 다른 멤버의 변경을 합칠 때 "내가 뭘 고쳤는지" 기준이에요.
  const baseBlocks = useRef([]);
  // BlockEditor가 등록하는 "화면 블록 통째로 바꾸기" 함수(다른 멤버 변경을 화면에 넣을 때 써요).
  const editorApply = useRef(null);
  const pulling = useRef(false);
  const pullAgain = useRef(false);
  const pullStartedAt = useRef(0);
  const timer = useRef(null);
  const running = useRef(false);
  const again = useRef(false);
  const dirty = useRef(false);
  const loaded = useRef(false);
  const requestId = useRef(0);

  const pageIdMapRef = useRef(pageIdMap);
  const getKnownPageIdsRef = useRef(getKnownPageIds);
  useEffect(() => {
    pageIdMapRef.current = pageIdMap;
    getKnownPageIdsRef.current = getKnownPageIds;
  });

  const ctx = () => ({
    idMap: idMap.current,
    dbBlockIds: dbBlockIds.current,
    synced: synced.current,
    resolvePageId: (id) => pageIdMapRef.current[id] ?? id,
  });

  /* ---------- 불러오기 ---------- */

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    loaded.current = false;
    setLoad({ status: "loading", error: null, blocks: null });

    try {
      const detail = await getPageDetail(pageId);

      // 데이터베이스 블록은 열·행·셀을 따로 받아와요. 하나라도 못 받으면 저장할 때 그 블록이 지워지니 페이지 전체를 실패로 봐요.
      const databaseIds = detail.blocks.filter((b) => b.type === "DATABASE" && b.databaseId != null).map((b) => b.databaseId);
      const details = await Promise.all(databaseIds.map(getDatabaseDetail));
      if (id !== requestId.current) return;

      const databases = new Map(databaseIds.map((dbId, i) => [dbId, toEditorDatabase(details[i])]));
      const mapped = toEditorBlocks(detail.blocks, { knownPageIds: getKnownPageIdsRef.current?.(), databases });
      const blocks = mapped.length > 0 ? mapped : blankBlocks();

      idMap.current = new Map(mapped.map((b) => [String(b.id), b.id]));
      dbBlockIds.current = new Set(mapped.filter((b) => b.type === "DATABASE").map((b) => b.id));
      bindings.current = new Map(
        detail.blocks
          .filter((b) => b.type === "DATABASE" && b.databaseId != null)
          .map((b) => [String(b.blockId), bindingFromLoaded(details[databaseIds.indexOf(b.databaseId)])]),
      );
      synced.current = collectServerImages(detail.blocks);
      commentState.current = commentStateFromServer(detail.blocks, toEditorComments);
      // 에디터가 처음에 하는 것과 똑같이 모양을 바로잡아 둬요 — 그래야 "내가 고친 블록인지" 비교가 처음부터 정확해요.
      const normalized = blocks.map(normalizeBlockShape).filter(Boolean);
      latest.current = normalized;
      baseBlocks.current = normalized;
      lastKey.current = syncKey(toSyncItems(normalized, ctx()));
      dirty.current = false;
      loaded.current = true;

      setSaveState("saved");
      setLoad({ status: "ready", error: null, blocks });
    } catch (err) {
      if (id !== requestId.current) return;
      setLoad({ status: "error", error: getErrorMessage(err, "페이지 내용을 불러오지 못했어요."), blocks: null });
    }
  }, [pageId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    return () => {
      requestId.current++;
    };
  }, [reload]);

  /* ---------- 저장 ---------- */

  // 서버가 가진 이미지 파일을 에디터 블록과 맞춰요(올리기 / 지우기). blockId가 정해진 뒤에만 할 수 있어요.
  const reconcileImages = async (snapshot) => {
    const alive = new Set(snapshot.map((b) => String(b.id)));
    for (const cid of [...synced.current.keys()]) if (!alive.has(cid)) synced.current.delete(cid);

    let firstError = null;

    for (const block of snapshot) {
      const cid = String(block.id);
      const blockId = idMap.current.get(cid);
      if (blockId == null) continue;

      const isMedia = block.type === "IMAGE" || block.type === "FILE";
      const url = isMedia ? block.image?.url : null;

      try {
        if (url && isLocalUrl(url)) {
          if (synced.current.get(cid) === url) continue;
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], block.image?.fileName || "file", { type: blob.type });
          await uploadBlockImage(blockId, file);
          synced.current.set(cid, url);
        } else if (synced.current.has(cid) && synced.current.get(cid) !== url) {
          // 이미지가 지워졌거나, 외부 주소로 바뀌었거나, 다른 타입의 블록이 됐어요.
          await deleteBlockImage(blockId);
          synced.current.delete(cid);
        }
      } catch (err) {
        console.error("블록 이미지 저장 실패", err);
        firstError ??= getErrorMessage(err, "이미지를 저장하지 못했어요.");
      }
    }

    if (firstError) throw new Error(firstError);
  };

  // 데이터베이스·표 블록을 서버와 맞춰요. 새로 만든 블록은 서버에 만들고 서버 블록 id를 받아요.
  // 만든 게 있으면 true(블록 목록의 위치·부모를 맞추려고 한 번 더 저장해요), 기다리는 게 있으면 pending도 알려줘요.
  const syncDatabases = async (snapshot) => {
    const result = { created: false, pending: false };
    const resolvePageId = (id) => pageIdMapRef.current[id] ?? id;

    const dbBlocks = snapshot.filter((b) => b.type === "DATABASE" && b.database);
    const alive = new Set(dbBlocks.map((b) => String(b.id)));
    for (const cid of [...bindings.current.keys()]) if (!alive.has(cid)) bindings.current.delete(cid);

    for (const block of dbBlocks) {
      const cid = String(block.id);
      let binding = bindings.current.get(cid);

      if (!binding) {
        const made = await createBinding(pageId, block.database, { resolvePageId });
        if (!made) {
          result.pending = true; // 첫 행의 페이지가 서버에 만들어지길 기다려요.
          continue;
        }
        binding = made.binding;
        bindings.current.set(cid, binding);
        idMap.current.set(cid, made.blockId);
        dbBlockIds.current.add(made.blockId);
        result.created = true;
      }

      const { deferred } = await syncDatabase(binding, block.database, { resolvePageId });
      if (deferred) result.pending = true;
    }

    return result;
  };

  /* ---------- 다른 멤버의 변경 받아오기 ---------- */

  // 서버의 최신 페이지를 받아서 내 화면에 "블록 단위로" 합쳐요(components/page/lib/blockMerge.js).
  // 내가 고친 블록은 그대로 두고, 다른 멤버가 고치거나 만들거나 지운 블록만 반영해요.
  // 새로 받은 블록의 서버 id는 에디터 블록 id로 그대로 쓰되, 내 화면의 다른 블록 id와 겹치면 새 id를 줘요.
  const pullRemote = async () => {
    const apply = editorApply.current;
    if (!loaded.current || !apply) return;

    const request = requestId.current;
    const detail = await getPageDetail(pageId);

    // 다른 멤버가 새로 만든 데이터베이스 블록은 내용도 같이 받아와요(안 받으면 내 다음 저장이 그 블록을 지워요).
    const localIds = new Set(latest.current.map((b) => String(b.id)));
    const serverToEditor = new Map();
    for (const [editorId, serverId] of idMap.current) serverToEditor.set(serverId, editorId);

    const newDatabases = detail.blocks.filter(
      (b) => b.type === "DATABASE" && b.databaseId != null && !serverToEditor.has(b.blockId),
    );
    const databaseDetails = await Promise.all(newDatabases.map((b) => getDatabaseDetail(b.databaseId)));

    if (request !== requestId.current || !loaded.current) return;

    // ---- 여기부터는 await 없이 한 번에 처리해요(그 사이에 내가 타이핑한 내용이 섞이지 않게) ----
    const local = latest.current;
    const used = new Set(local.map((b) => String(b.id)));
    let maxId = Math.max(0, ...local.map((b) => Number(b.id) || 0), ...detail.blocks.map((b) => b.blockId));

    const editorIdOf = new Map(); // 서버 블록 id → 에디터 블록 id
    const toEditorId = (serverId) => {
      if (editorIdOf.has(serverId)) return editorIdOf.get(serverId);

      let editorId;
      const known = serverToEditor.get(serverId);
      if (known != null) {
        editorId = local.find((b) => String(b.id) === known)?.id ?? (Number.isFinite(Number(known)) ? Number(known) : known);
      } else {
        editorId = used.has(String(serverId)) ? ++maxId : serverId;
        used.add(String(editorId));
      }
      editorIdOf.set(serverId, editorId);
      return editorId;
    };

    const items = detail.blocks.map((b) => ({
      ...b,
      blockId: toEditorId(b.blockId),
      parentBlockId: b.parentBlockId == null ? null : toEditorId(b.parentBlockId),
    }));

    const databases = new Map(
      newDatabases.map((b, i) => [b.databaseId, toEditorDatabase(databaseDetails[i])]),
    );
    const remoteBlocks = toEditorBlocks(items, { knownPageIds: getKnownPageIdsRef.current?.(), databases })
      .map(normalizeBlockShape)
      .filter(Boolean);

    const resolvePageId = (id) => pageIdMapRef.current[id] ?? id;
    const sig = (block) => blockSig(block, resolvePageId);

    // 에디터가 넣을 때 들여쓰기를 바로잡으니(normalizeIndents) 여기서도 똑같이 해 두고,
    // 결과가 내 화면과 내용상 같으면 아무 것도 하지 않아요(같은 내용을 계속 다시 넣는 일을 막아요).
    const merged = normalizeIndents(mergeBlocks({ base: baseBlocks.current, local, remote: remoteBlocks, sig }));
    const sameAsLocal =
      merged.length === local.length &&
      merged.every((block, i) => {
        const mine = local[i];
        if (block === mine) return true;
        return String(block.id) === String(mine.id) && (block.indent || 0) === (mine.indent || 0) && sig(block) === sig(mine);
      });

    const previousBase = baseBlocks.current;
    baseBlocks.current = remoteBlocks;
    debugSync("서버 최신 내용 받음", { 서버블록: remoteBlocks.length, 내블록: local.length, 바뀜: !sameAsLocal });
    if (sameAsLocal) return;

    // 서버 id 대응표 · 댓글/이미지 기록을 서버 상태에 맞춰요(안 맞추면 다음 저장 때 중복으로 만들거나 지워요).
    const remoteById = new Map(remoteBlocks.map((b) => [String(b.id), b]));
    const localById = new Map(local.map((b) => [String(b.id), b]));
    const serverComments = commentStateFromServer(detail.blocks, toEditorComments);
    const serverImages = collectServerImages(detail.blocks);

    for (const b of detail.blocks) {
      const editorKey = String(editorIdOf.get(b.blockId));
      idMap.current.set(editorKey, b.blockId);
      if (b.type === "DATABASE") dbBlockIds.current.add(b.blockId);
    }

    newDatabases.forEach((b, i) => {
      bindings.current.set(String(editorIdOf.get(b.blockId)), bindingFromLoaded(databaseDetails[i]));
    });

    for (const block of merged) {
      const key = String(block.id);
      const remoteBlock = remoteById.get(key);
      if (!remoteBlock || (localById.has(key) && sig(block) !== sig(remoteBlock))) continue; // 내 것이 이긴 블록은 그대로 둬요.

      const serverId = idMap.current.get(key);
      const entry = serverComments.get(String(serverId));
      if (entry) commentState.current.set(key, entry);
      else commentState.current.delete(key);

      const image = serverImages.get(String(serverId));
      if (image) synced.current.set(key, image);
      else if (!localById.has(key)) synced.current.delete(key);
    }

    const next = merged;
    latest.current = next;
    setIdVersion((v) => v + 1);
    // 서버와 같아진 부분은 다시 저장하지 않게 기준 키를 서버 상태로 맞춰요(내가 고친 게 남아 있으면 키가 달라서 저장돼요).
    lastKey.current = syncKey(toSyncItems(remoteBlocks, ctx()));
    // 실행 취소/다시 실행 기록도 같은 방식으로 합쳐 둬요 — 안 그러면 undo가 옛 스냅샷으로 되돌리면서
    // 그 뒤에 다른 멤버가 추가한 블록이 "내가 지운 것"이 돼 다음 저장 때 서버에서 지워져요.
    apply(next, (snapshot) => normalizeIndents(mergeBlocks({ base: previousBase, local: snapshot, remote: remoteBlocks, sig })));
  };

  // 다른 멤버가 저장했다는 알림을 받았을 때 불러요.
  const onRemoteContent = () => {
    debugSync("다른 멤버 저장 알림", { loaded: loaded.current, running: running.current, dirty: dirty.current });
    if (!loaded.current) return;

    // 보내는 중이면 끝난 뒤 한 번 더 돌면서 합쳐요(보내기 전에 어차피 먼저 받아와서 합쳐요).
    if (running.current) {
      again.current = true;
      return;
    }
    // 아직 안 보낸 내 변경이 있어도 바로 받아와요 — 내가 고친 블록은 병합에서 내 것이 이기니까 안전해요.
    // 받아오는 중이면 끝난 뒤 한 번 더 받아와요. 응답이 너무 오래 안 오면(15초) 멈춘 걸로 보고 새로 시작해요.
    if (pulling.current && Date.now() - pullStartedAt.current < 15000) {
      pullAgain.current = true;
      return;
    }

    pulling.current = true;
    pullStartedAt.current = Date.now();
    pullRemote()
      .catch((err) => console.warn("다른 멤버의 변경을 받아오지 못했어요", err))
      .finally(() => {
        pulling.current = false;
        if (pullAgain.current) {
          pullAgain.current = false;
          onRemoteContent();
        }
      });
  };

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!loaded.current) return;

    // 이미 보내는 중이면 끝난 뒤에 한 번 더 보내요(그 사이에 바뀐 내용 반영).
    if (running.current) {
      again.current = true;
      return;
    }

    running.current = true;
    try {
      do {
        again.current = false;

        // 저장하기 전에 다른 멤버가 그 사이 저장한 내용을 먼저 합쳐요(안 그러면 내 저장이 그 내용을 덮어써요).
        // 못 받아왔으면 저장하지 않고 멈춰요 — 그냥 저장하면 그 사이 다른 멤버가 쓴 내용이 지워질 수 있어요(다시 시도로 이어서 저장해요).
        try {
          await pullRemote();
        } catch (err) {
          console.warn("다른 멤버의 변경을 받아오지 못했어요", err);
          throw new Error("다른 멤버의 변경을 확인하지 못해서 저장을 멈췄어요. 잠시 뒤 다시 시도해 주세요.");
        }

        const snapshot = latest.current;
        const items = toSyncItems(snapshot, ctx());
        const key = syncKey(items);

        setSaveState("saving");
        setSaveError(null);

        if (key !== lastKey.current) {
          const results = await syncBlocks(pageId, items);
          // 서버가 돌려준 블록 id로 새로 만들어요(목록에서 빠진 블록은 서버에서 지워졌으니 같이 잊어요).
          idMap.current = new Map(results.map((r) => [r.clientId, r.block.blockId]));
          dbBlockIds.current = new Set(results.filter((r) => r.block.type === "DATABASE").map((r) => r.block.blockId));
          lastKey.current = key;
          // 방금 저장한 상태가 서버 상태예요(서버 id가 있는 블록만).
          baseBlocks.current = snapshot.filter((b) => idMap.current.has(String(b.id)));
          setIdVersion((v) => v + 1);
        }

        const dbResult = await syncDatabases(snapshot);
        if (dbResult.created) again.current = true;

        await syncComments(commentState.current, snapshot, idMap.current);
        await reconcileImages(snapshot);
        if (!again.current && !dbResult.pending) dirty.current = false;
      } while (again.current);

      setSaveState("saved");
    } catch (err) {
      console.error("블록 저장 실패", err);
      setSaveError(getErrorMessage(err, "저장하지 못했어요."));
      setSaveState("error");
    } finally {
      running.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const schedule = useCallback(() => {
    if (!loaded.current) return;
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, BLOCK_SAVE_DELAY_MS);
  }, [flush]);

  const onChange = useCallback(
    (blocks) => {
      latest.current = blocks;
      schedule();
    },
    [schedule],
  );

  // 임시 페이지가 서버에 만들어져 실제 id를 받으면 하위 페이지 링크의 pageId가 바뀌어서 다시 저장해요.
  const mapSize = Object.keys(pageIdMap).length;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mapSize > 0) schedule();
  }, [mapSize, schedule]);

  // 페이지를 떠나거나(언마운트) 탭을 닫을 때 아직 안 보낸 변경이 있으면 마저 보내요.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirty.current || running.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(timer.current);
      if (dirty.current) flush();
    };
  }, [flush]);

  // 에디터 블록 id ↔ 서버 blockId 변환(아직 저장 전인 새 블록은 서버 id가 없어서 null).
  // 같은 페이지를 보는 다른 멤버에게 "내가 편집 중인 블록"을 알릴 때 써요.
  const toServerBlockId = useCallback((editorId) => idMap.current.get(String(editorId)) ?? null, []);
  const toEditorBlockId = useCallback((serverId) => {
    for (const [editorId, id] of idMap.current) {
      if (id === serverId) return editorId;
    }
    return null;
  }, []);

  const onRemoteContentRef = useRef(onRemoteContent);
  useEffect(() => {
    onRemoteContentRef.current = onRemoteContent;
  });
  const notifyRemoteContent = useCallback(() => onRemoteContentRef.current(), []);

  return {
    idVersion,
    editorApply,
    notifyRemoteContent,
    toServerBlockId,
    toEditorBlockId,
    status: load.status,
    error: load.error,
    blocks: load.blocks,
    onChange,
    saveState,
    saveError,
    retry: flush,
    reload,
  };
}
