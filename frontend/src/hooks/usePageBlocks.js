import { useCallback, useEffect, useRef, useState } from "react";
import { deleteBlockImage, getPageDetail, syncBlocks, uploadBlockImage } from "../api/blocks";
import { getDatabaseDetail } from "../api/databases";
import { bindingFromLoaded, createBinding, syncDatabase } from "../api/databaseSync";
import { collectServerImages, syncKey, toEditorBlocks, toEditorComments, toEditorDatabase, toSyncItems } from "../api/mappers";
import { commentStateFromServer, syncComments } from "../api/commentSync";
import { getErrorMessage } from "../utils/apiError";

// 블록을 고치고 나서 서버에 보내기까지 기다리는 시간(타이핑 중 요청 폭주 방지).
const BLOCK_SAVE_DELAY_MS = 800;

const blankBlocks = () => [{ id: 1, type: "TEXT", content: "" }];
const isLocalUrl = (url) => /^(data:|blob:)/i.test(url ?? "");

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

  const latest = useRef(null); // 에디터의 가장 최근 블록 배열
  const idMap = useRef(new Map()); // 에디터 블록 id(문자열) → 서버 blockId
  const dbBlockIds = useRef(new Set()); // 서버에서 데이터베이스인 블록의 blockId
  const synced = useRef(new Map()); // 서버가 이미지 파일을 가진 블록 id → 그때 에디터가 보여준 url
  const commentState = useRef(new Map()); // 블록 id(문자열) → 서버가 아는 댓글(commentSync)
  const bindings = useRef(new Map()); // 데이터베이스 블록 id(문자열) → 서버가 아는 데이터베이스 상태(databaseSync)
  const lastKey = useRef(null);
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
      latest.current = blocks;
      lastKey.current = syncKey(toSyncItems(blocks, ctx()));
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

  return {
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
