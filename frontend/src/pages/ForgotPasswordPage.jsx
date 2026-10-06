import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import AuthShell from "../components/auth/AuthShell";
import * as authApi from "../api/auth";
import { getErrorMessage } from "../utils/apiError";

// 같은 계정으로 메일을 다시 보낼 수 있기까지 기다리는 시간(초) — 서버도 10초 안에는 다시 보내지 않아요.
const RESEND_SECONDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 찾기: 이메일을 입력하면 재설정 링크를 메일로 보내줘요.
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState(null); // 메일을 보냈다고 안내한 이메일
  const [wait, setWait] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const isValid = EMAIL_PATTERN.test(email.trim());

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    if (!isValid || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await authApi.forgotPassword(email.trim());
      setSentTo(email.trim());
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(getErrorMessage(err, "메일을 보내지 못했어요. 잠시 후 다시 시도해주세요."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send();
  };

  if (sentTo) {
    return (
      <AuthShell>
        <div className="login-form">
          <span className="login-label">PASSWORD</span>
          <h1>메일을 보냈어요</h1>
          <p>
            <b>{sentTo}</b>로 가입한 계정이 있다면 비밀번호 재설정 링크를 보냈어요. 링크는 30분 동안만 쓸 수 있어요. 메일이 안 보이면 스팸함도
            확인해주세요.
          </p>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="login-button" onClick={() => navigate("/login")}>
            로그인으로 돌아가기
          </button>

          <div className="signup-link">
            <span>메일이 오지 않았나요?</span>
            <button type="button" onClick={send} disabled={wait > 0 || submitting}>
              {wait > 0 ? `다시 보내기 (${wait}초)` : "다시 보내기"}
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <span className="login-label">PASSWORD</span>

        <h1>비밀번호 찾기</h1>
        <p>가입한 이메일을 입력하면 비밀번호를 다시 정할 수 있는 링크를 보내드려요.</p>

        <div className="login-field">
          <label htmlFor={emailId}>이메일</label>

          <div className="login-input">
            <Mail size={18} />
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-button" disabled={!isValid || submitting}>
          {submitting ? "보내는 중..." : "재설정 메일 보내기"}
        </button>

        <div className="signup-link">
          <span>비밀번호가 기억나셨나요?</span>
          <button type="button" onClick={() => navigate("/login")}>
            로그인
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
