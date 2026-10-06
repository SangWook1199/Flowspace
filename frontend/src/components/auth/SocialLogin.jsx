import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import googleIcon from "../../assets/login/google-icon.png";
import microsoftIcon from "../../assets/login/microsoft-icon.png";
import { useAuth } from "../../context/useAuth";
import { getSafeRedirect } from "../../utils/authRedirect";
import { getErrorMessage } from "../../utils/apiError";
import {
  GOOGLE_CLIENT_ID,
  MICROSOFT_CLIENT_ID,
  SocialLoginCancelled,
  loadGoogleIdentity,
  signInWithMicrosoft,
} from "../../utils/socialAuth";

export default function SocialLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { socialLogin } = useAuth();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const googleSlotRef = useRef(null);

  // 서버 로그인 → 원래 가려던 곳(없으면 홈)으로 이동. Google 콜백은 한 번만 등록하니까 최신 함수를 ref로 불러요.
  const finish = async (provider, payload) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");

    try {
      await socialLogin(provider, payload);
      navigate(getSafeRedirect(location.state?.from) ?? "/", { replace: true });
    } catch (err) {
      if (!(err instanceof SocialLoginCancelled)) {
        setError(getErrorMessage(err, "소셜 로그인에 실패했어요. 다시 시도해주세요."));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  // Google은 공식 로그인 버튼(iframe)을 우리 버튼 위에 투명하게 겹쳐 둬요 — 눌렀을 때 Google 로그인 창이 뜨고,
  // 끝나면 ID 토큰이 콜백으로 와요. (보이는 모양은 그대로 우리 버튼이에요.)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleSlotRef.current) return undefined;

    let cancelled = false;

    loadGoogleIdentity()
      .then((gid) => {
        const slot = googleSlotRef.current;
        if (cancelled || !slot) return;

        gid.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) finishRef.current("google", response.credential);
          },
        });

        gid.renderButton(slot, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: Math.min(400, Math.max(200, Math.round(slot.parentElement?.offsetWidth ?? 200))),
        });
      })
      .catch(() => {
        // 스크립트를 못 불러오면 겹친 버튼이 없어요 — 우리 버튼을 누르면 안내가 나와요.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 투명 버튼이 덮지 못한 가장자리를 누르거나 설정이 없을 때 오는 곳이에요.
  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google 로그인이 아직 설정되지 않았어요. (VITE_GOOGLE_CLIENT_ID)");
      return;
    }
    setError("");
    window.google?.accounts?.id?.prompt();
  };

  const handleMicrosoftLogin = async () => {
    if (!MICROSOFT_CLIENT_ID) {
      setError("Microsoft 로그인이 아직 설정되지 않았어요. (VITE_MICROSOFT_CLIENT_ID)");
      return;
    }
    if (busyRef.current) return;

    setError("");

    try {
      const tokens = await signInWithMicrosoft();
      await finish("microsoft", tokens);
    } catch (err) {
      if (err instanceof SocialLoginCancelled) return;
      console.error("[Microsoft 로그인]", err);

      // Microsoft가 알려준 이유(AADSTS… 코드)가 있으면 같이 보여줘요 — 설정 문제를 찾는 데 도움이 돼요.
      const detail = err?.message && err.message !== "popup-blocked" ? ` (${String(err.message).slice(0, 160)})` : "";
      setError(
        err?.message === "popup-blocked"
          ? "팝업이 차단됐어요. 이 사이트의 팝업을 허용하고 다시 시도해주세요."
          : `Microsoft 로그인에 실패했어요. 다시 시도해주세요.${detail}`,
      );
    }
  };

  return (
    <div className="social-login">
      <div className="social-divider">
        <span>또는</span>
      </div>

      <div className="social-buttons">
        <div className="social-slot">
          <button type="button" className="social-button google" disabled={busy} onClick={handleGoogleLogin}>
            <img src={googleIcon} alt="Google" />
            Google
          </button>

          {GOOGLE_CLIENT_ID && (
            <div
              className="social-google-overlay"
              ref={googleSlotRef}
              style={busy ? { pointerEvents: "none" } : undefined}
            />
          )}
        </div>

        <button type="button" className="social-button microsoft" disabled={busy} onClick={handleMicrosoftLogin}>
          <img src={microsoftIcon} alt="Microsoft" />
          Microsoft
        </button>
      </div>

      {error && (
        <p className="social-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
