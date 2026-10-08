import { useEffect, useMemo, useRef } from "react";

import BlockEditor from "./BlockEditor";
import { usePageBlocks } from "../../hooks/usePageBlocks";

// 페이지 본문: 서버에서 블록을 불러와 BlockEditor에 넘기고, 고친 내용은 알아서 서버에 저장해요.
// 페이지가 바뀌면 통째로 다시 마운트돼요(부모에서 key={pageId}).
export default function PageBlocks({
  pageId,
  pages,
  pageIdMap,
  onCreateChildPage,
  onDuplicatePage,
  onRenameRowPage,
  onDeleteRowPage,
  sprintTasks,
  onToggleSubtask,
  viewers = [],
  onReportBlock,
  remoteContentSeq = 0,
}) {
  // 불러오는 순간의 페이지 목록으로 "없어진 페이지를 가리키는 링크"를 걸러내요.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  });

  const {
    status,
    error,
    blocks,
    onChange,
    saveState,
    saveError,
    conflictCount,
    dismissConflictNotice,
    retry,
    reload,
    toServerBlockId,
    toEditorBlockId,
    idVersion,
    editorApply,
    notifyRemoteContent,
  } =
    usePageBlocks(pageId, {
      getKnownPageIds: () => new Set(pagesRef.current.map((p) => p.id)),
      pageIdMap,
    });

  // 다른 멤버가 저장했다는 알림이 오면(번호가 올라가면) 잠깐 모아서 한 번만 받아와요.
  useEffect(() => {
    if (!remoteContentSeq) return undefined;
    const timer = setTimeout(notifyRemoteContent, 150);
    return () => clearTimeout(timer);
  }, [remoteContentSeq, notifyRemoteContent]);

  // 알림이 중간에 새거나 늦어도 놓치지 않게, 탭이 보이는 동안 주기적으로도 확인해요.
  // (같이 보는 멤버가 있으면 2초마다, 혼자면 10초마다 — 바뀐 게 없으면 화면은 그대로예요.)
  const hasViewers = viewers.length > 0;
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) notifyRemoteContent();
    };
    const timer = setInterval(tick, hasViewers ? 2000 : 10000);
    return () => clearInterval(timer);
  }, [hasViewers, notifyRemoteContent]);

  // 다른 멤버가 편집 중인 블록 → { 에디터 블록 id: [멤버…] }. (내 화면에 없는 블록이면 건너뛰어요.)
  const remoteEditors = useMemo(() => {
    const map = {};
    for (const viewer of viewers) {
      if (viewer.blockId == null) continue;
      const editorId = toEditorBlockId(viewer.blockId);
      if (editorId == null) continue;
      (map[editorId] ??= []).push(viewer);
    }
    return map;
    // idVersion: 다른 멤버가 방금 만든 블록이 내 화면에 들어온 뒤에야 그 블록에 이름표를 붙일 수 있어서, 대응이 바뀌면 다시 계산해요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewers, toEditorBlockId, idVersion]);

  // 커서가 들어간 블록을 서버에 알려요(에디터 안 어디서든 focus가 위로 올라오니까 감싸는 div 하나로 잡아요).
  // 방금 만든 블록처럼 아직 서버에 저장되기 전이면 서버 id가 없어서, 일단 "편집 중인 블록 없음"으로 알리고
  // 저장이 끝나 서버 id가 생기면 아래 효과가 다시 알려요.
  const focusedEditorId = useRef(null);

  const reportFocus = (e) => {
    const row = e.target.closest?.("[data-block-id]");
    if (!row) return;
    focusedEditorId.current = row.dataset.blockId;
    onReportBlock?.(toServerBlockId(row.dataset.blockId));
  };

  // 에디터 밖으로 커서가 완전히 나가면 "편집 중인 블록 없음"으로 알려요.
  const reportBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      focusedEditorId.current = null;
      onReportBlock?.(null);
    }
  };

  // 저장이 끝나 서버 id가 정해지면(Enter로 만든 새 블록 등) 지금 커서가 있는 블록을 다시 알려요.
  useEffect(() => {
    if (focusedEditorId.current == null) return;
    const serverId = toServerBlockId(focusedEditorId.current);
    if (serverId != null) onReportBlock?.(serverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idVersion]);

  if (status === "loading") {
    return (
      <p className="page-detail__missing" role="status">
        내용을 불러오는 중이에요…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div>
        <p className="page-detail__missing" role="alert">
          {error}
        </p>
        <button type="button" className="page-detail__cover-btn" style={{ margin: "0 auto" }} onClick={reload}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      {saveState !== "saved" && (
        <div className={`page-save-status page-save-status--${saveState}`} role={saveState === "error" ? "alert" : "status"}>
          {saveState === "saving" ? (
            "저장 중…"
          ) : (
            <>
              <span>{saveError || "저장하지 못했어요."}</span>
              <button type="button" onClick={retry}>
                다시 시도
              </button>
            </>
          )}
        </div>
      )}

      {conflictCount > 0 && (
        <div className="page-save-status page-save-status--notice" role="status">
          <span>
            {conflictCount === 1
              ? "다른 멤버가 같은 블록을 수정했어요. 내가 고친 내용으로 저장했어요."
              : `다른 멤버가 같은 블록 ${conflictCount}개를 수정했어요. 내가 고친 내용으로 저장했어요.`}
          </span>
          <button type="button" onClick={dismissConflictNotice}>
            확인
          </button>
        </div>
      )}

      <div style={{ display: "contents" }} onFocus={reportFocus} onBlur={reportBlur}>
      <BlockEditor
        remoteEditors={remoteEditors}
        applyRef={editorApply}
        blocks={blocks}
        onChange={onChange}
        pages={pages}
        pageIdMap={pageIdMap}
        onCreateChildPage={onCreateChildPage}
        onDuplicatePage={onDuplicatePage}
        onRenameRowPage={onRenameRowPage}
        onDeleteRowPage={onDeleteRowPage}
        sprintTasks={sprintTasks}
        onToggleSubtask={onToggleSubtask}
      />
      </div>
    </>
  );
}
