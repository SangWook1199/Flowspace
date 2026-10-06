import { useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import SocialLogin from "./SocialLogin";
import { useAuth } from "../../context/useAuth";
import { getSafeRedirect } from "../../utils/authRedirect";
import { getErrorMessage } from "../../utils/apiError";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // label과 input을 연결(htmlFor/id)해서 라벨을 눌러도 입력창에 포커스가
  // 가고, 스크린리더가 입력창 이름을 읽을 수 있게 해요. 같은 화면에 폼이
  // 둘 이상 생겨도 id가 겹치지 않도록 useId로 만들어요.
  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 켜 두면 브라우저를 닫아도 로그인이 이어지고, 끄면 이 탭을 닫을 때 로그아웃돼요.
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const isValid = email.trim() !== "" && password.trim() !== "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // state는 다음 렌더 때 반영돼서, 엔터+버튼 클릭처럼 같은 순간에 두 번
  // 들어오면 둘 다 통과할 수 있어요. ref는 즉시 바뀌어서 중복 요청을 막아요.
  const submittingRef = useRef(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isValid || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await login(email.trim(), password, remember);

      // ProtectedRoute가 기억해둔 "원래 가려던 곳"이 있으면 거기로, 없거나
      // 외부/위험한 주소면 홈으로 보내요.
      navigate(getSafeRedirect(location.state?.from) ?? "/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "로그인에 실패했어요. 다시 시도해주세요."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin} noValidate>
      <span className="login-label">LOGIN</span>

      <h1>로그인</h1>
      <p>협업을 시작해보세요</p>

      <div className="login-field">
        <label htmlFor={emailId}>이메일</label>

        <div className="login-input">
          <Mail size={18} />
          <input
            id={emailId}
            type="email"
            autoComplete="username"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="login-field">
        <label htmlFor={passwordId}>비밀번호</label>

        <div className="login-input">
          <Lock size={18} />

          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="login-options">
        <label>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          로그인 상태 유지
        </label>

        <button type="button" className="forgot-password" onClick={() => navigate("/forgot-password")}>
          비밀번호 찾기
        </button>
      </div>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="login-button"
        disabled={!isValid || submitting}
      >
        {submitting ? "로그인 중..." : "로그인"}
      </button>

      <SocialLogin />

      <div className="signup-link">
        <span>계정이 없으신가요?</span>

        <button type="button" onClick={() => navigate("/signup")}>
          회원가입
        </button>
      </div>
    </form>
  );
}
