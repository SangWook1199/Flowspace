import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Inbox, X } from "lucide-react";
import NotificationIcon from "./NotificationIcon";
import { useNotifications } from "../context/NotificationContext";
import { toRelativeTime } from "../api/mappers";
import { getErrorMessage } from "../utils/apiError";
import "../styles/notifications.css";

// 헤더의 종 아이콘이에요. 읽지 않은 알림 수를 배지로 보여주고, 누르면 알림 목록이 열려요.
// 초대 알림은 목록 안에서 바로 수락/거절할 수 있어요(이미 처리한 초대는 버튼 없이 "처리 완료"로 보여요).
export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    hasNext,
    loading,
    pendingInviteIds,
    invitesLoaded,
    loadMore,
    loadInvites,
    markAllRead,
    remove,
    acceptInvite,
    declineInvite,
    openNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  // 열려 있는 동안만 바깥 클릭과 Esc를 감지해서 닫아요.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    // 열 때마다 받은 초대를 다시 확인해서 수락/거절 버튼이 최신 상태로 보이게 해요.
    if (!open) loadInvites();
    setOpen((prev) => !prev);
  };

  const visible = useMemo(
    () => (tab === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [tab, notifications],
  );

  const handleOpen = (notification) => {
    openNotification(notification);
    if (notification.linkPath) setOpen(false);
  };

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="notiWrap" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="bell"
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 안 읽음` : "알림"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell />
        {unreadCount > 0 && <span className="bellBadge">{badge}</span>}
      </button>

      {open && (
        <div className="notiPanel" role="dialog" aria-label="알림">
          <div className="notiPanel__head">
            <strong>알림</strong>
            <button type="button" className="notiPanel__readAll" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check size={14} />
              모두 읽음
            </button>
          </div>

          <div className="notiPanel__tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
              전체
            </button>
            <button type="button" role="tab" aria-selected={tab === "unread"} onClick={() => setTab("unread")}>
              안 읽음{unreadCount > 0 ? ` ${badge}` : ""}
            </button>
          </div>

          <div className="notiPanel__list">
            {visible.length === 0 ? (
              <p className="notiPanel__empty">
                <Inbox size={26} />
                {tab === "unread" ? "안 읽은 알림이 없어요." : "아직 알림이 없어요."}
              </p>
            ) : (
              visible.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  inviteState={
                    notification.type !== "WORKSPACE_INVITE" || !invitesLoaded
                      ? null
                      : pendingInviteIds.includes(notification.refId)
                        ? "pending"
                        : "done"
                  }
                  onOpen={handleOpen}
                  onRemove={remove}
                  onAccept={acceptInvite}
                  onDecline={declineInvite}
                  onSettled={() => setOpen(false)}
                />
              ))
            )}

            {hasNext && tab === "all" && (
              <button type="button" className="notiPanel__more" onClick={loadMore} disabled={loading}>
                {loading ? "불러오는 중…" : "더 보기"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, inviteState, onOpen, onRemove, onAccept, onDecline, onSettled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action, closeAfter) => {
    setBusy(true);
    setError("");
    try {
      await action(notification);
      if (closeAfter) onSettled();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(notification);
    }
  };

  return (
    <div className={`notiItem${notification.read ? "" : " notiItem--unread"}`}>
      <div className="notiItem__main" role="button" tabIndex={0} onClick={() => onOpen(notification)} onKeyDown={onKeyDown}>
        <span className="notiItem__dot" aria-label={notification.read ? undefined : "안 읽음"} />
        <NotificationIcon type={notification.type} />

        <span className="notiItem__text">
          <span className="notiItem__message">{notification.message}</span>
          <small>
            {[notification.workspaceName, toRelativeTime(notification.createdAt)].filter(Boolean).join(" · ")}
          </small>
        </span>
      </div>

      <button
        type="button"
        className="notiItem__remove"
        aria-label="알림 삭제"
        onClick={() => onRemove(notification.id)}
      >
        <X size={14} />
      </button>

      {inviteState === "pending" && (
        <div className="notiItem__actions">
          <button type="button" className="notiItem__accept" disabled={busy} onClick={() => run(onAccept, true)}>
            수락
          </button>
          <button type="button" className="notiItem__decline" disabled={busy} onClick={() => {
              if (window.confirm("이 워크스페이스 초대를 거절할까요?")) run(onDecline, false);
            }}>
            거절
          </button>
        </div>
      )}
      {inviteState === "done" && <p className="notiItem__done">처리가 끝난 초대예요.</p>}
      {error && (
        <p className="notiItem__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
