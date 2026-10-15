import { useEffect, useRef, useState } from "react";

import * as authApi from "../../api/auth";
import { getErrorMessage } from "../../utils/apiError";

// 같은 계정으로 인증 메일을 다시 보낼 수 있기까지 기다리는 시간(초) — 서버도 30초 안에는 다시 보내지 않아요.
const RESEND_SECONDS = 30;

// "메일이 오지 않았나요? 다시 보내기" 한 줄. 가입 직후 안내 화면과, 인증 전에 로그인하려 할 때 써요.
// startWaiting: 방금 메일을 보낸 직후라면 true로 두어 바로 누르지 못하게 해요.
export default function ResendVerification({ email, startWaiting = false }) {
  const [wait, setWait] = useState(startWaiting ? RESEND_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sendingRef = useRef(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const resend = async () => {
    if (sendingRef.current || wait > 0) return;

    sendingRef.current = true;
    setSending(true);
    setError("");
    setMessage("");

    try {
      await authApi.resendVerification(email);
      setMessage("인증 메일을 다시 보냈어요. 스팸함도 확인해 주세요.");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(getErrorMessage(err, "메일을 보내지 못했어요. 잠시 후 다시 시도해주세요."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <>
      {message && <p role="status">{message}</p>}

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <div className="signup-link">
        <span>메일이 오지 않았나요?</span>
        <button type="button" onClick={resend} disabled={wait > 0 || sending}>
          {wait > 0 ? `다시 보내기 (${wait}초)` : "다시 보내기"}
        </button>
      </div>
    </>
  );
}
