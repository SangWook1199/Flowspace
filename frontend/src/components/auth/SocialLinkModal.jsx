import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../context/useAuth";
import { getErrorMessage } from "../../utils/apiError";
import { emailFromIdToken } from "../../utils/socialAuth";

const PROVIDER_LABEL = { google: "Google", microsoft: "Microsoft" };

// 소셜 로그인 때 "같은 이메일로 가입한 계정이 있어요"라고 나오면 뜨는 창이에요.
// 그 계정의 비밀번호를 입력해서 본인임을 확인하면 소셜 계정을 연결하고 바로 로그인해요.
// provider: "google" | "microsoft", payload: 소셜 로그인 때 받은 값(Google = ID 토큰, Microsoft = { idToken, accessToken })
export default function SocialLinkModal({ provider, payload, onClose, onLinked }) {
  const { linkSocialAccount } = useAuth();

  const uid = useId();
  const titleId = `${uid}-title`;
  const inputId = `${uid}-password`;

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const inputRef = useRef(null);

  const idToken = provider === "google" ? payload : payload?.idToken;
  const accessToken = provider === "microsoft" ? payload?.accessToken : undefined;
  const email = emailFromIdToken(idToken);
  const label = PROVIDER_LABEL[provider] ?? "소셜";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !submittingRef.current) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password === "" || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await linkSocialAccount({ provider: provider.toUpperCase(), idToken, accessToken, password });
      onLinked();
    } catch (err) {
      setError(getErrorMessage(err, "계정을 연결하지 못했어요. 다시 시도해주세요."));
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="social-link-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submittingRef.current) onClose();
      }}
    >
      <form className="social-link-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={handleSubmit}>
        <h2 id={titleId}>기존 계정과 연결할까요?</h2>

        <p className="social-link-desc">
          {email ? <b>{email}</b> : "이 이메일"}로 가입한 계정이 이미 있어요. 그 계정의 비밀번호를 입력하면 {label} 계정을 연결하고,
          다음부터 {label}로도 로그인할 수 있어요.
        </p>

        <label className="social-link-label" htmlFor={inputId}>
          비밀번호
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="social-link-input"
          type="password"
          autoComplete="current-password"
          placeholder="기존 계정의 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="social-link-error" role="alert">
            {error}
          </p>
        )}

        <div className="social-link-actions">
          <button type="button" className="social-link-cancel" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className="social-link-submit" disabled={password === "" || submitting}>
            {submitting ? "연결 중..." : "연결하고 로그인"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
