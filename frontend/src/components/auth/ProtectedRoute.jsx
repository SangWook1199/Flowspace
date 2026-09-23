import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// 로그인해야 볼 수 있는 페이지들(대시보드, 칸반 등)을 감싸는 용도예요.
// AuthProvider가 아직 토큰 유효성을 확인 중(loading)이면 섣불리
// /login으로 튕기지 않고 잠깐 기다렸다가, 최종적으로 user가 없으면
// 로그인 페이지로 보내요.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-boot-loading">불러오는 중...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
