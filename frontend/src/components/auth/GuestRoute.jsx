import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// 반대로 /login, /signup은 "로그인 안 한 사람"만 볼 이유가 있는
// 페이지예요. 이미 로그인된 상태로 주소를 직접 치고 들어오면 다시
// 로그인/가입 폼을 보여주는 대신 홈으로 보내줘요.
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-boot-loading">불러오는 중...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
