import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, X } from "lucide-react";

import SocialLogin from "./SocialLogin";

export default function SignupForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
    profile: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProfile = (e) => {
    const file = e.target.files?.[0];
    if (file) updateField("profile", file);
  };

  const removeProfile = () => {
    updateField("profile", null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSignup = () => {
    // TODO : Spring Signup API
    console.log(form);
  };

  const step1Valid =
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  const signupValid = step1Valid && form.nickname && form.agree;

  const previewImage = form.profile ? URL.createObjectURL(form.profile) : null;

  const previewText = form.nickname
    ? form.nickname.charAt(0).toUpperCase()
    : null;

  return (
    <div className="login-form">
      <span className="login-label">SIGN UP</span>

      <h1>회원가입</h1>
      <p>FlowSpace와 함께 협업을 시작하세요</p>

      {/* Progress */}
      <div className="signup-progress">
        <div className="signup-progress-bar">
          <div className={`signup-progress-fill ${step === 2 ? "full" : ""}`} />
        </div>

        <span>STEP {step} / 2</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <>
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

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
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

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="login-button"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
          >
            다음
          </button>

          <SocialLogin />

          <div className="signup-link">
            <span>이미 계정이 있으신가요?</span>

            <button type="button" onClick={() => navigate("/login")}>
              로그인
            </button>
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <div className="profile-preview">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {previewImage ? (
                  <img src={previewImage} alt="profile" />
                ) : previewText ? (
                  <span>{previewText}</span>
                ) : (
                  <User size={28} />
                )}
              </div>

              {previewImage && (
                <button
                  type="button"
                  className="profile-remove"
                  onClick={removeProfile}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <p>사진을 선택하지 않으면 닉네임 첫 글자가 프로필로 표시됩니다.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfile}
            />

            <button
              type="button"
              className="profile-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              프로필 사진 선택
            </button>
          </div>

          <div className="login-field">
            <label>닉네임</label>

            <div className="login-input">
              <User size={18} />

              <input
                type="text"
                placeholder="닉네임을 입력하세요"
                value={form.nickname}
                onChange={(e) => updateField("nickname", e.target.value)}
              />
            </div>
          </div>

          <div className="login-options signup-agree">
            <label>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => updateField("agree", e.target.checked)}
              />
              이용약관 및 개인정보 처리방침에 동의합니다.
            </label>
          </div>

          <div className="signup-actions">
            <button
              type="button"
              className="signup-back"
              onClick={() => setStep(1)}
            >
              이전
            </button>

            <button
              className="login-button"
              disabled={!signupValid}
              onClick={handleSignup}
            >
              가입하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
