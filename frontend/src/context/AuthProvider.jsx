import { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import * as authApi from "../api/auth";
import { saveTokens, clearTokens, getAccessToken } from "../utils/token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // 새로고침하면 user state는 그냥 사라지지만 localStorage의 accessToken은
  // 남아있어요. 그래서 앱이 처음 뜰 때 토큰이 있으면 /auth/me로 "이 토큰
  // 아직 유효해?"를 물어보고, 유효하면 user를 다시 채워요(= 로그인 상태
  // 유지). loading이 끝나기 전까지는 로그인 여부를 아직 모르는 상태라서,
  // ProtectedRoute/GuestRoute가 이 값을 보고 리다이렉트를 잠깐 미뤄요.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .getMe()
      .then(({ data }) => setUser(data))
      .catch(() => {
        // 토큰이 만료됐거나 유효하지 않으면 조용히 로그아웃 상태로 정리.
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    saveTokens(data);
    setUser(data.user);
    return data;
  };

  const signup = async (payload) => {
    const { data } = await authApi.signup(payload);
    saveTokens(data);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
