import { useEffect } from "react";
import { X } from "lucide-react";
import NotificationIcon from "./NotificationIcon";
import "../styles/notifications.css";

const VISIBLE_MS = 6000;

// 새 알림이 실시간으로 오면 화면 오른쪽 아래에 잠깐 떠요. 누르면 그 알림으로 이동하고, 몇 초 뒤엔 저절로 사라져요.
export default function NotificationToast({ notification, onOpen, onClose }) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(onClose, VISIBLE_MS);
    return () => clearTimeout(timer);
    // onClose가 매 렌더 새로 만들어져도 타이머가 다시 시작되지 않게 알림이 바뀔 때만 돌려요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification]);

  if (!notification) return null;

  return (
    <div className="notiToast" role="status" aria-live="polite">
      <button type="button" className="notiToast__body" onClick={() => onOpen(notification)}>
        <NotificationIcon type={notification.type} />
        <span>
          <small>{notification.workspaceName || "FlowSpace"}</small>
          <strong>{notification.message}</strong>
        </span>
      </button>
      <button type="button" className="notiToast__close" aria-label="알림 닫기" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}
