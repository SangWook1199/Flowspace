import { useContext, useEffect, useMemo } from "react";
import NotificationContext from "../context/NotificationContext";
import WorkspaceContext from "../context/WorkspaceContext";
import { useAuth } from "../context/useAuth";

// 이 페이지를 보는 동안 서버에 "보고 있어요"를 알리고, 같이 보는 다른 멤버 목록을 돌려줘요.
//   const { viewers, reportBlock } = usePagePresence(pageId);
// - viewers: [{ userId, blockId(서버 블록 id | null), name, initial, profileImageUrl }] — 나는 빼요.
// - contentSeq: 다른 멤버가 이 페이지를 저장할 때마다 올라가는 번호 — 바뀌면 최신 내용을 받아와서 합쳐요.
// - reportBlock(serverBlockId | null): 내가 편집 중인 블록을 알려요(null이면 커서가 없는 거예요).
// Provider가 없는 화면(테스트 등)에선 아무 일도 안 해요.
export function usePagePresence(pageId) {
  const notifications = useContext(NotificationContext);
  const workspace = useContext(WorkspaceContext);
  const auth = useAuth();

  const myId = auth?.user?.id ?? null;
  const reportPageView = notifications?.reportPageView;
  const pagePresence = notifications?.pagePresence;
  const pageContent = notifications?.pageContent;
  const members = workspace?.members;

  // 페이지에 들어오면 알리고, 떠나거나 다른 페이지로 바뀌면 떠났다고 알려요.
  useEffect(() => {
    if (pageId == null || !reportPageView) return undefined;
    reportPageView(Number(pageId), null);
    return () => reportPageView(null);
  }, [pageId, reportPageView]);

  const viewers = useMemo(() => {
    if (!pagePresence || String(pagePresence.pageId) !== String(pageId)) return [];

    return pagePresence.viewers
      .filter((v) => v.userId !== myId)
      .map((v) => {
        const member = (members ?? []).find((m) => m.id === v.userId);
        return {
          userId: v.userId,
          blockId: v.blockId ?? null,
          name: member?.name ?? "멤버",
          initial: member?.initial ?? "?",
          profileImageUrl: member?.profileImageUrl ?? null,
        };
      });
  }, [pagePresence, pageId, myId, members]);

  const reportBlock = useMemo(
    () => (blockId) => reportPageView?.(Number(pageId), blockId ?? null),
    [reportPageView, pageId],
  );

  // 이 페이지를 다른 멤버가 저장할 때마다 올라가는 번호(0이면 아직 없음)
  const contentSeq = pageContent && String(pageContent.pageId) === String(pageId) ? pageContent.seq : 0;

  return { viewers, reportBlock, contentSeq };
}
