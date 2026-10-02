import client from "./client";
import { toNotification } from "./mappers";

// 내 알림 목록 (최신순). page는 0부터 시작해요.
export const getNotifications = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await client.get("/notifications", { params: { page, size } });
  return {
    items: data.items.map(toNotification),
    page: data.page,
    hasNext: data.hasNext,
    unreadCount: data.unreadCount,
  };
};

// 읽지 않은 알림 수
export const getUnreadCount = async () => {
  const { data } = await client.get("/notifications/unread-count");
  return data.unreadCount;
};

export const markNotificationRead = (notificationId) => client.patch(`/notifications/${notificationId}/read`);

export const markAllNotificationsRead = () => client.patch("/notifications/read-all");

export const deleteNotification = (notificationId) => client.delete(`/notifications/${notificationId}`);
