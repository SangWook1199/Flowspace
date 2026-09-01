import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

import SocialLogin from "./SocialLogin";

export default function SignupForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSignup = () => {
    // TODO : Spring Signup API
    console.log(form);
  };

  const isValid =
    form.name &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.agree;

  return (
    <div className="login-form">
      <span className="login-label">SIGN UP</span>

      <h1>회원가입</h1>
      <p>FlowSpace와 함께 협업을 시작하세요</p>

      <div className="login-field">
        <label>이름</label>

        <div className="login-input">
          <User size={18} />
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>
      </div>

      <div className="login-field">
        <label>이메일</label>

        <div className="login-input">
          <Mail size={18} />
          <input
            type="email"
            placeholder="이메일을 입력하세요"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
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
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
          />

          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="login-field">
        <label>비밀번호 확인</label>

        <div className="login-input">
          <Lock size={18} />
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="비밀번호를 다시 입력하세요"
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
          />

          <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="login-options">
        <label>
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => updateField("agree", e.target.checked)}
          />
          이용약관 및 개인정보 처리방침에 동의합니다.
        </label>
      </div>

      <button
        className="login-button"
        disabled={!isValid}
        onClick={handleSignup}
      >
        회원가입
      </button>

      <SocialLogin />

      <div className="signup-link">
        <span>이미 계정이 있으신가요?</span>

        <button type="button" onClick={() => navigate("/login")}>
          로그인
        </button>
      </div>
    </div>
  );
}
