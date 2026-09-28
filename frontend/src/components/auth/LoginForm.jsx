import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import SocialLogin from "./SocialLogin";
import { useAuth } from "../../context/useAuth";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isValid = email.trim() !== "" && password.trim() !== "";

  // "로그인 상태 유지" 체크박스는 아직 백엔드에 별도 옵션이 없어서(항상
  // accessToken/refreshToken을 localStorage에 저장) UI상으로만 존재해요.
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ?? "로그인에 실패했어요. 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-form">
      <span className="login-label">LOGIN</span>

      <h1>로그인</h1>
      <p>협업을 시작해보세요</p>

      <div className="login-field">
        <label>이메일</label>

        <div className="login-input">
          <Mail size={18} />
          <input
            type="email"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="login-field">
        <label>비밀번호</label>

        <div className="login-input">
          <Lock size={18} />

          <input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <button type="button" onClick={() => setShowPassword(!showPassword)}>
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

        <button type="button" className="forgot-password">
          비밀번호 찾기
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <button
        className="login-button"
        onClick={handleLogin}
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
    </div>
  );
}
