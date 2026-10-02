import { getAccessToken } from "./token";

// 알림을 실시간으로 받는 WebSocket 연결이에요. 서버 주소는 API 주소(VITE_API_BASE_URL)에서 뽑아요:
// http → ws, https → wss, 끝의 /api는 떼고 /ws를 붙여요. (브라우저 WebSocket은 헤더를 못 실어서
// 토큰은 주소의 ?token= 으로 보내요.)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const PING_INTERVAL_MS = 25000;
const MAX_RETRY_DELAY_MS = 30000;

export const buildSocketUrl = (token) => {
  const base = new URL(API_BASE, window.location.href);
  const path = base.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base.origin.replace(/^http/, "ws")}${path}/ws?token=${encodeURIComponent(token)}`;
};

// 끊기면 1초, 2초, 4초… (최대 30초) 간격으로 다시 이어요.
// beforeConnect는 연결할 때마다 먼저 불러요 — 토큰이 만료됐어도 이 REST 요청이 토큰을 다시 받아주고,
// 끊겨 있는 동안 놓친 알림도 여기서 다시 맞춰요.
export function createNotificationSocket({ onMessage, onOpen, beforeConnect }) {
  let socket = null;
  let retryTimer = null;
  let pingTimer = null;
  let attempts = 0;
  let closed = false;

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempts);
    attempts += 1;
    retryTimer = setTimeout(connect, delay);
  };

  async function connect() {
    if (closed) return;

    try {
      await beforeConnect?.();
    } catch {
      // 실패해도 연결은 시도해요.
    }
    if (closed) return;

    const token = getAccessToken();
    if (!token) {
      scheduleReconnect();
      return;
    }

    const ws = new WebSocket(buildSocketUrl(token));
    socket = ws;

    ws.onopen = () => {
      attempts = 0;
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, PING_INTERVAL_MS);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        onMessage?.(JSON.parse(event.data));
      } catch {
        // 알 수 없는 메시지는 무시해요.
      }
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      clearInterval(pingTimer);
      if (socket === ws) socket = null;
      scheduleReconnect();
    };
  }

  connect();

  return {
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    },
  };
}
