import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthContext from "./AuthContext";
import * as authApi from "../api/auth";
import { toUser } from "../api/mappers";
import { AUTH_LOGOUT_EVENT } from "../api/client";
import { saveTokens, clearTokens, getAccessToken } from "../utils/token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // 새로고침하면 user state는 그냥 사라지지만 localStorage의 accessToken은
  // 남아있어요. 그래서 앱이 처음 뜰 때 토큰이 있으면 /auth/me로 "이 토큰
  // 아직 유효해?"를 물어보고, 유효하면 user를 다시 채워요(= 로그인 상태
  // 유지). loading이 끝나기 전까지는 로그인 여부를 아직 모르는 상태라서,
  // ProtectedRoute/GuestRoute가 이 값을 보고 리다이렉트를 잠깐 미뤄요.
  const [loading, setLoading] = useState(true);

  // 토큰은 있는데 서버 점검/네트워크 끊김처럼 "일시적인" 이유로 내 정보를
  // 못 가져온 상태예요. 이때 토큰을 지워버리면 서버가 잠깐 아팠다는 이유만으로
  // 멀쩡한 사용자가 로그아웃되니까, 토큰은 그대로 두고 이 플래그만 켜서
  // ProtectedRoute가 "다시 시도" 안내를 보여주게 해요.
  const [authError, setAuthError] = useState(false);

  // 부팅 중 요청이 겹쳤을 때(다시 시도 연타, 요청 중 로그인/로그아웃) 늦게
  // 도착한 오래된 응답이 최신 상태를 덮어쓰지 않도록 요청마다 번호를 매겨요.
  const bootId = useRef(0);

  const loadMe = useCallback(() => {
    const id = ++bootId.current;
    const isLatest = () => id === bootId.current;

    if (!getAccessToken()) {
      setAuthError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);

    authApi
      .getMe()
      .then(({ data }) => {
        if (isLatest()) setUser(toUser(data));
      })
      .catch((err) => {
        if (!isLatest()) return;

        const status = err.response?.status;

        if (status === 401 || status === 403) {
          // 토큰이 만료됐거나 유효하지 않다고 서버가 확실히 말해준 경우에만
          // 조용히 로그아웃 상태로 정리해요. (401은 refresh까지 시도해보고도
          // 안 된 뒤에 여기로 와요.)
          clearTokens();
          setUser(null);
        } else {
          // 네트워크 오류/5xx 등: 토큰은 살려두고 user만 비워둬요.
          setUser(null);
          setAuthError(true);
        }
      })
      .finally(() => {
        if (isLatest()) setLoading(false);
      });
  }, []);

  useEffect(() => {
    // 이벤트 리스너를 getMe보다 먼저 달아요. 부팅 중 getMe가 401을 받고
    // refresh까지 실패하면 바로 이 이벤트가 오기 때문이에요.
    const onForcedLogout = () => {
      bootId.current++;
      setUser(null);
      setAuthError(false);
      setLoading(false);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    loadMe();

    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    bootId.current++;
    saveTokens(data);
    setUser(toUser(data.user));
    setAuthError(false);
    return data;
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await authApi.signup(payload);
    bootId.current++;
    saveTokens(data);
    setUser(toUser(data.user));
    setAuthError(false);
    return data;
  }, []);

  // 서버에 로그아웃 API가 따로 없어서(토큰은 클라이언트가 들고 있는
  // 방식) 저장된 토큰을 지우고 user를 비우는 걸로 끝나요. 나중에 서버가
  // refresh token 폐기를 지원하면 여기서 한 번 호출해주면 돼요.
  const logout = useCallback(() => {
    bootId.current++;
    clearTokens();
    setUser(null);
    setAuthError(false);
  }, []);

  // 프로필 수정 응답처럼 서버 user를 그대로 넘겨도 화면 모양으로 바꿔서 저장해요.
  const updateUser = useCallback((dto) => setUser(toUser(dto)), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      login,
      signup,
      logout,
      setUser: updateUser,
      retryAuth: loadMe,
    }),
    [user, loading, authError, login, signup, logout, updateUser, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
