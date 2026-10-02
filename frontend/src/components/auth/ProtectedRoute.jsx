import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// 로그인해야 볼 수 있는 페이지들(대시보드, 칸반 등)을 감싸는 용도예요.
// AuthProvider가 아직 토큰 유효성을 확인 중(loading)이면 섣불리
// /login으로 튕기지 않고 잠깐 기다렸다가, 최종적으로 user가 없으면
// 로그인 페이지로 보내요.
export default function ProtectedRoute({ children }) {
  const { user, loading, authError, retryAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-boot-loading">불러오는 중...</div>;
  }

  // 토큰은 남아있는데 서버 문제로 내 정보를 못 가져온 경우예요. 이때
  // /login으로 보내면 멀쩡한 로그인이 풀린 것처럼 보이니까, 안내 문구와
  // 다시 시도 버튼만 보여줘요.
  if (!user && authError) {
    return (
      <div className="auth-boot-loading" role="alert" style={{ gap: 12 }}>
        서버에 연결할 수 없어요.
        <button
          type="button"
          className="forgot-password"
          style={{ fontSize: 14, color: "#4f46e5" }}
          onClick={retryAuth}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!user) {
    // 로그인 후 원래 보던 화면으로 돌아올 수 있게 가려던 주소를 기억해둬요.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  return children;
}
