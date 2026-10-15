import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AuthShell from "../components/auth/AuthShell";
import * as authApi from "../api/auth";
import { getErrorMessage } from "../utils/apiError";

// 이메일 인증: 가입 메일의 링크(/verify-email?token=…)로 들어오면 바로 인증을 마쳐요.
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // 토큰은 처음 한 번만 읽어서 들고 있고, 주소창·방문 기록에는 남지 않게 주소에서 지워요.
  const [token] = useState(() => params.get("token") ?? "");

  // "verifying" | "done" | "failed"
  const [status, setStatus] = useState(token ? "verifying" : "failed");
  const [error, setError] = useState(token ? "" : "인증 링크가 올바르지 않아요.");
  // 링크는 한 번만 쓸 수 있어서, 개발 모드의 이중 실행이나 다시 그리기로 두 번 보내지 않게 막아요.
  const startedRef = useRef(false);

  useEffect(() => {
    if (params.has("token")) navigate("/verify-email", { replace: true });
  }, [params, navigate]);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setStatus("done"))
      .catch((err) => {
        setError(getErrorMessage(err, "인증하지 못했어요. 잠시 후 다시 시도해주세요."));
        setStatus("failed");
      });
  }, [token]);

  return (
    <AuthShell>
      <div className="login-form">
        <span className="login-label">VERIFY</span>

        {status === "verifying" && (
          <>
            <h1>인증하는 중이에요</h1>
            <p role="status">잠시만 기다려 주세요…</p>
          </>
        )}

        {status === "done" && (
          <>
            <h1>이메일 인증을 마쳤어요</h1>
            <p>이제 로그인할 수 있어요. 가입한 이메일과 비밀번호로 로그인해 주세요.</p>

            <button type="button" className="login-button" onClick={() => navigate("/login", { replace: true })}>
              로그인하러 가기
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <h1>인증하지 못했어요</h1>
            <p role="alert">{error}</p>
            <p>인증 메일은 로그인 화면에서 이메일과 비밀번호를 입력하면 다시 받을 수 있어요.</p>

            <button type="button" className="login-button" onClick={() => navigate("/login", { replace: true })}>
              로그인 화면으로
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
