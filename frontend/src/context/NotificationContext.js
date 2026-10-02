import { createContext, useContext } from "react";

const NotificationContext = createContext(null);

export default NotificationContext;

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications는 <NotificationProvider> 안에서만 쓸 수 있어요. App.jsx에서 Routes를 <NotificationProvider>(BrowserRouter 안쪽)로 감싸 주세요.",
    );
  }
  return ctx;
}
