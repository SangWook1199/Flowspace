import { useId, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";

import AuthShell from "../components/auth/AuthShell";
import * as authApi from "../api/auth";
import { getErrorCode, getErrorMessage } from "../utils/apiError";

const MIN_LENGTH = 8;
const MAX_LENGTH = 20;

// 비밀번호 재설정: 메일 링크(/reset-password?token=…)로 들어와서 새 비밀번호를 정해요.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const uid = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const submittingRef = useRef(false);

  const lengthOk = password.length >= MIN_LENGTH && password.length <= MAX_LENGTH;
  const matches = password === confirm;
  const isValid = lengthOk && matches;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await authApi.resetPassword({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      if (getErrorCode(err) === "INVALID_RESET_TOKEN") setTokenInvalid(true);
      setError(getErrorMessage(err, "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해주세요."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="login-form">
          <span className="login-label">PASSWORD</span>
          <h1>비밀번호를 바꿨어요</h1>
          <p>새 비밀번호로 로그인해주세요. 보안을 위해 다른 기기에서는 로그아웃됐어요.</p>

          <button type="button" className="login-button" onClick={() => navigate("/login", { replace: true })}>
            로그인하러 가기
          </button>
        </div>
      </AuthShell>
    );
  }

  // 링크에 토큰이 없거나, 서버가 "만료됐거나 이미 썼어요"라고 했을 때
  if (!token || tokenInvalid) {
    return (
      <AuthShell>
        <div className="login-form">
          <span className="login-label">PASSWORD</span>
          <h1>링크를 쓸 수 없어요</h1>
          <p>{error || "링크가 올바르지 않아요. 비밀번호 찾기를 다시 해주세요."}</p>

          <button type="button" className="login-button" onClick={() => navigate("/forgot-password", { replace: true })}>
            비밀번호 찾기 다시 하기
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <span className="login-label">PASSWORD</span>

        <h1>새 비밀번호 정하기</h1>
        <p>앞으로 사용할 새 비밀번호를 입력해주세요.</p>

        <div className="login-field">
          <label htmlFor={`${uid}-new`}>새 비밀번호</label>

          <div className="login-input">
            <Lock size={18} />
            <input
              id={`${uid}-new`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={`${MIN_LENGTH}~${MAX_LENGTH}자로 입력하세요`}
              maxLength={MAX_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
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

        <div className="login-field">
          <label htmlFor={`${uid}-confirm`}>새 비밀번호 확인</label>

          <div className="login-input">
            <Lock size={18} />
            <input
              id={`${uid}-confirm`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="한 번 더 입력하세요"
              maxLength={MAX_LENGTH}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {password !== "" && !lengthOk && (
          <p className="login-error" role="alert">
            비밀번호는 {MIN_LENGTH}~{MAX_LENGTH}자로 입력해주세요.
          </p>
        )}
        {lengthOk && confirm !== "" && !matches && (
          <p className="login-error" role="alert">
            비밀번호가 서로 달라요.
          </p>
        )}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-button" disabled={!isValid || submitting}>
          {submitting ? "바꾸는 중..." : "비밀번호 바꾸기"}
        </button>
      </form>
    </AuthShell>
  );
}
