import axios from "axios";
import { refresh } from "./auth";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "../utils/token";

// 배포 환경마다 서버 주소가 다르니까 .env의 VITE_API_BASE_URL을 우선
// 쓰고, 없을 때만 로컬 개발용 주소로 떨어져요.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// 토큰이 완전히 만료돼서 로그인 상태를 더 유지할 수 없을 때 window로
// 쏘는 이벤트 이름이에요. 이 파일은 React 바깥(axios)이라 Context를
// 직접 못 건드려서, AuthProvider가 이 이벤트를 듣고 user를 비워줘요.
// 그러면 ProtectedRoute가 알아서 /login으로 보내요.
export const AUTH_LOGOUT_EVENT = "auth:logout";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();

  // skipAuth: 로그인/재발급처럼 토큰이 필요 없는(오히려 만료 토큰이
  // 걸림돌인) 요청이에요.
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 이 주소들에서 난 401은 "토큰 만료"가 아니라 "이메일/비밀번호가 틀렸어요"
// 같은 정상적인 실패 응답이에요. 여기서 refresh를 시도하면 로그인 화면에서
// 오류 메시지 대신 엉뚱한 재시도가 돌거나 무한 루프가 될 수 있어서 제외해요.
const NO_REFRESH_URL = /^\/?auth\/(login|signup|refresh|google|microsoft)(\?|$)/;

// 동시에 여러 요청이 401을 받아도 refresh는 딱 한 번만 보내요. refresh
// token이 1회용(rotation)인 서버에선 동시에 두 번 보내면 두 번째가
// 실패해서 멀쩡한 사용자가 로그아웃되기 때문이에요. 진행 중인 Promise를
// 공유하고, 끝나면 비워서 다음 만료 때 다시 쓸 수 있게 해요.
let refreshPromise = null;

const NO_REFRESH_TOKEN = "NO_REFRESH_TOKEN";

const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();

    refreshPromise = (
      refreshToken
        ? refresh(refreshToken).then(({ data }) => {
            saveTokens(data);
            return data.accessToken;
          })
        : Promise.reject(new Error(NO_REFRESH_TOKEN))
    ).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// refresh 토큰 자체가 거절된 경우(없음/400/401/403)만 "세션이 끝났다"고
// 봐요. 네트워크가 잠깐 끊겼거나 서버가 5xx인 경우엔 토큰이 멀쩡할 수
// 있으니, 로그아웃시키지 않고 원래 오류만 그대로 돌려줘요.
const isSessionExpired = (refreshError) => {
  if (!refreshError.response) {
    return refreshError.message === NO_REFRESH_TOKEN;
  }

  return [400, 401, 403].includes(refreshError.response.status);
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      NO_REFRESH_URL.test(original.url ?? "")
    ) {
      return Promise.reject(error);
    }

    // 무한 루프 방지: 재시도한 요청이 또 401이면 더 시도하지 않아요.
    original._retry = true;

    let newToken;

    try {
      // 이 요청이 나간 뒤에 다른 요청이 이미 토큰을 갱신했을 수 있어요.
      // 그땐 또 refresh하지 말고 최신 토큰으로 바로 재시도해요.
      const sentWith = original.headers?.Authorization;
      const current = getAccessToken();

      newToken =
        current && sentWith !== `Bearer ${current}`
          ? current
          : await refreshAccessToken();
    } catch (refreshError) {
      if (isSessionExpired(refreshError)) {
        clearTokens();
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
      }

      // 호출한 쪽(예: AuthProvider)이 원래 401 오류를 보고 판단할 수 있게
      // refresh 오류가 아니라 원래 오류를 넘겨요.
      return Promise.reject(error);
    }

    // 재시도는 try 밖에서 해요. 재시도한 요청 자체의 실패(예: 500)를
    // "refresh 실패"로 착각해서 로그아웃시키면 안 되니까요.
    original.headers.Authorization = `Bearer ${newToken}`;
    return client(original);
  },
);

export default client;
