import { useState } from "react";
import AuthContext from "./AuthContext";
import * as authApi from "../api/auth";
import { saveTokens, clearTokens } from "../utils/token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

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
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
