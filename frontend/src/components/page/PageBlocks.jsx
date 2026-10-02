import { useEffect, useRef } from "react";

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
}) {
  // 불러오는 순간의 페이지 목록으로 "없어진 페이지를 가리키는 링크"를 걸러내요.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  });

  const { status, error, blocks, onChange, saveState, saveError, retry, reload } = usePageBlocks(pageId, {
    getKnownPageIds: () => new Set(pagesRef.current.map((p) => p.id)),
    pageIdMap,
  });

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

      <BlockEditor
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
    </>
  );
}
