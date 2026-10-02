import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationContext from "./NotificationContext";
import { useAuth } from "./useAuth";
import { useWorkspace } from "./WorkspaceContext";
import * as notificationApi from "../api/notifications";
import * as workspaceApi from "../api/workspaces";
import { toNotification } from "../api/mappers";
import { createNotificationSocket } from "../utils/notificationSocket";
import NotificationToast from "../layout/NotificationToast";

const PAGE_SIZE = 20;

// 알림 목록 · 읽지 않은 수 · 받은 초대를 들고 있고, WebSocket으로 새 알림이 오면 바로 반영해요.
// 로그인한 사람이 바뀌면(로그인·로그아웃) 전부 비우고 새로 받아요.
// BrowserRouter 안쪽, WorkspaceProvider 안쪽에 둬야 해요(알림을 눌러 화면을 옮기고, 워크스페이스를 다시 불러오려고요).
export function NotificationProvider({ children }) {
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;
  const navigate = useNavigate();
  const {
    currentWorkspaceId,
    switchWorkspace,
    reloadWorkspaces,
    reloadMembers,
    setMemberPresence,
    acceptInvite: acceptWorkspaceInvite,
  } = useWorkspace();

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  // 아직 수락/거절하지 않은 초대의 inviteId들 — 초대 알림에 수락/거절 버튼을 보일지 정해요.
  const [pendingInviteIds, setPendingInviteIds] = useState([]);
  // 초대 목록을 한 번이라도 받아왔는지 — 받기 전엔 "처리된 초대"로 잘못 보이지 않게 구분해요.
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  const requestId = useRef(0);
  const nextPage = useRef(0);

  // 소켓 콜백은 한 번만 만들어서 계속 쓰니까, 최신 값이 필요한 동작은 ref로 넘겨요.
  const pushEffectRef = useRef(() => {});
  // 접속 상태 반영과 "소켓이 (다시) 열렸을 때 팀원 목록 맞추기"도 같은 이유로 ref로 넘겨요.
  const presenceRef = useRef({ apply: () => {}, resync: () => {} });

  /* ---------- 불러오기 ---------- */

  const loadInvites = useCallback(async () => {
    try {
      const invites = await workspaceApi.getMyInvites();
      setPendingInviteIds(invites.map((invite) => invite.inviteId));
      setInvitesLoaded(true);
    } catch {
      // 초대 목록을 못 받아도 알림 자체는 쓸 수 있어요.
    }
  }, []);

  // 첫 페이지부터 다시 받아요(처음 열 때 · 소켓이 다시 이어졌을 때).
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);

    try {
      const result = await notificationApi.getNotifications({ page: 0, size: PAGE_SIZE });
      if (id !== requestId.current) return;

      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setHasNext(result.hasNext);
      nextPage.current = 1;
    } catch {
      // 실패하면 이전 목록을 그대로 둬요.
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext) return;
    const id = requestId.current;
    setLoading(true);

    try {
      const result = await notificationApi.getNotifications({ page: nextPage.current, size: PAGE_SIZE });
      if (id !== requestId.current) return;

      // 새 알림이 위에 쌓이면 서버 쪽 페이지 경계가 밀려서 같은 알림이 또 올 수 있어요 → id로 걸러요.
      setItems((prev) => {
        const known = new Set(prev.map((n) => n.id));
        return [...prev, ...result.items.filter((n) => !known.has(n.id))];
      });
      setUnreadCount(result.unreadCount);
      setHasNext(result.hasNext);
      nextPage.current += 1;
    } catch {
      // 다음에 다시 눌러보면 돼요.
    } finally {
      setLoading(false);
    }
  }, [loading, hasNext]);

  /* ---------- 실시간 연결 ---------- */

  useEffect(() => {
    requestId.current++;
    nextPage.current = 0;

    /* eslint-disable react-hooks/set-state-in-effect */
    setItems([]);
    setUnreadCount(0);
    setHasNext(false);
    setPendingInviteIds([]);
    setInvitesLoaded(false);
    setToast(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (userId == null) return undefined;

    const socket = createNotificationSocket({
      // 연결할 때마다 읽지 않은 수를 먼저 맞춰요(끊겨 있던 동안 온 알림 반영, 만료된 토큰 재발급).
      beforeConnect: async () => {
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
      },
      onOpen: () => {
        refresh();
        loadInvites();
        // 끊겨 있던 동안 놓친 접속 상태 변화를 팀원 목록을 다시 받아서 맞춰요.
        presenceRef.current.resync();
      },
      onMessage: (message) => {
        if (message?.type === "PRESENCE" && message.data) {
          presenceRef.current.apply(message.data.userId, Boolean(message.data.online), message.data.lastActiveAt);
          return;
        }
        if (message?.type !== "NOTIFICATION" || !message.data) return;
        const notification = toNotification(message.data);

        setItems((prev) => (prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev]));
        setUnreadCount((count) => count + 1);
        setToast(notification);
        pushEffectRef.current(notification);
      },
    });

    return () => socket.close();
  }, [userId, refresh, loadInvites]);

  // 알림이 일으키는 화면 쪽 변화: 초대가 오면 초대 목록을, 소유권·멤버가 바뀌면 워크스페이스와 멤버를 다시 받아요.
  useEffect(() => {
    presenceRef.current = { apply: setMemberPresence, resync: reloadMembers };

    pushEffectRef.current = (notification) => {
      const inCurrent = notification.workspaceId != null && notification.workspaceId === currentWorkspaceId;

      switch (notification.type) {
        case "WORKSPACE_INVITE":
          loadInvites();
          break;
        case "MEMBER_REMOVED":
          // 내가 내보내진 거예요 — 목록에서 빼고, 보고 있던 곳이면 홈으로 보내요.
          reloadWorkspaces();
          if (inCurrent) navigate("/");
          break;
        case "OWNERSHIP_TRANSFERRED":
          reloadWorkspaces();
          if (inCurrent) reloadMembers();
          break;
        case "INVITE_ACCEPTED":
        case "MEMBER_LEFT":
          if (inCurrent) reloadMembers();
          break;
        default:
          break;
      }
    };
  });

  /* ---------- 읽음 · 삭제 ---------- */

  const markRead = useCallback(
    (notificationId) => {
      const target = items.find((n) => n.id === notificationId);
      if (!target || target.read) return;

      setItems((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
      notificationApi.markNotificationRead(notificationId).catch(refresh);
    },
    [items, refresh],
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    notificationApi.markAllNotificationsRead().catch(refresh);
  }, [refresh]);

  const remove = useCallback(
    (notificationId) => {
      const target = items.find((n) => n.id === notificationId);
      if (!target) return;

      setItems((prev) => prev.filter((n) => n.id !== notificationId));
      if (!target.read) setUnreadCount((count) => Math.max(0, count - 1));
      notificationApi.deleteNotification(notificationId).catch(refresh);
    },
    [items, refresh],
  );

  /* ---------- 초대 수락 · 거절 ---------- */

  // 서버가 그 초대 알림을 읽음으로 바꾸니까, 화면도 같이 읽음으로 맞춰요.
  const settleInvite = (notification) => {
    setPendingInviteIds((prev) => prev.filter((id) => id !== notification.refId));
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
  };

  // 수락하면 그 워크스페이스로 바로 들어가요. 실패하면 예외를 던져요(알림창이 문구를 보여줘요).
  const acceptInvite = async (notification) => {
    try {
      await acceptWorkspaceInvite(notification.refId, notification.workspaceId);
    } catch (err) {
      loadInvites();
      throw err;
    }
    settleInvite(notification);
    navigate("/");
  };

  const declineInvite = async (notification) => {
    try {
      await workspaceApi.declineInvite(notification.refId);
    } catch (err) {
      loadInvites();
      throw err;
    }
    settleInvite(notification);
  };

  /* ---------- 알림 열기 ---------- */

  // 알림을 누르면 읽음 처리하고, 다른 워크스페이스 알림이면 그 워크스페이스로 옮긴 뒤 해당 화면으로 가요.
  const openNotification = (notification) => {
    markRead(notification.id);
    if (notification.workspaceId != null && notification.workspaceId !== currentWorkspaceId) {
      switchWorkspace(notification.workspaceId);
    }
    if (notification.linkPath) navigate(notification.linkPath);
  };

  const value = {
    notifications: items,
    unreadCount,
    hasNext,
    loading,
    pendingInviteIds,
    invitesLoaded,
    loadMore,
    refresh,
    loadInvites,
    markRead,
    markAllRead,
    remove,
    acceptInvite,
    declineInvite,
    openNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast
        notification={toast}
        onOpen={(n) => {
          setToast(null);
          openNotification(n);
        }}
        onClose={() => setToast(null)}
      />
    </NotificationContext.Provider>
  );
}
