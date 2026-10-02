import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getSafeRedirect } from "../../utils/authRedirect";

// 반대로 /login, /signup은 "로그인 안 한 사람"만 볼 이유가 있는
// 페이지예요. 이미 로그인된 상태로 주소를 직접 치고 들어오면 다시
// 로그인/가입 폼을 보여주는 대신 홈으로 보내줘요. ProtectedRoute가
// 기억해둔 "원래 가려던 주소"가 있으면(안전한 내부 경로일 때만) 홈
// 대신 거기로 보내요. 로그인 직후 user가 채워지는 순간 이 컴포넌트가
// 먼저 리다이렉트하기 때문에, 목적지를 여기서도 똑같이 계산해야 해요.
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-boot-loading">불러오는 중...</div>;
  }

  if (user) {
    return <Navigate to={getSafeRedirect(location.state?.from) ?? "/"} replace />;
  }

  return children;
}
