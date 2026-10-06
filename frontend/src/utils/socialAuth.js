// 소셜 로그인(Google · Microsoft)에 필요한 브라우저 쪽 도구예요. 서버에는 ID 토큰만 보내고, 검증은 서버가 해요.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || "";
// 앱 등록이 "이 조직 디렉터리의 계정만"(단일 테넌트)이면 테넌트 ID가 꼭 필요해요. 비우면 개인·모든 조직 계정용(common)이에요.
export const MICROSOFT_TENANT_ID = import.meta.env.VITE_MICROSOFT_TENANT_ID || "common";

// 사용자가 팝업을 닫거나 취소했을 때 던지는 에러(화면에서 조용히 넘겨요).
export class SocialLoginCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialLoginCancelled";
  }
}

// ID 토큰(JWT)에 들어 있는 이메일을 화면에 보여주려고 읽어요(검증은 서버가 해요).
export function emailFromIdToken(idToken) {
  try {
    const part = String(idToken).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return claims.email || claims.preferred_username || "";
  } catch {
    return "";
  }
}

/* ---------------- Google ---------------- */

let googleScript = null;

// Google Identity Services 스크립트를 한 번만 불러와요.
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () =>
        window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("google"));
      script.onerror = () => reject(new Error("google"));
      document.head.appendChild(script);
    }).catch((err) => {
      googleScript = null; // 다음에 다시 시도할 수 있게
      throw err;
    });
  }

  return googleScript;
}

/* ---------------- Microsoft (코드 + PKCE, 팝업) ---------------- */

const MS_AUTHORIZE = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`;
const MS_TOKEN = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
const MS_SCOPE = "openid profile email User.Read";
const OAUTH_CHANNEL = "flowspace-oauth";
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

// 진행 중인 Microsoft 로그인 시도를 취소하는 함수(새로 시작하면 이전 시도는 정리해요)
let pendingCancel = null;

// Azure 앱 등록의 "SPA" 리디렉션 URI에 이 주소를 등록해야 해요.
export const microsoftRedirectUri = () => `${window.location.origin}/auth-callback.html`;

const base64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const randomString = (size = 32) => base64Url(crypto.getRandomValues(new Uint8Array(size)));

const sha256 = async (text) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

const decodeJwtPayload = (jwt) => {
  const part = jwt.split(".")[1] ?? "";
  const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0))));
};

// 팝업으로 Microsoft 로그인을 하고 { idToken, accessToken }을 돌려줘요.
export async function signInWithMicrosoft() {
  if (!MICROSOFT_CLIENT_ID) throw new Error("not-configured");

  const verifier = randomString(48);
  const state = randomString(16);
  const nonce = randomString(16);
  const challenge = base64Url(await sha256(verifier));
  const redirectUri = microsoftRedirectUri();

  const url = new URL(MS_AUTHORIZE);
  url.search = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MS_SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const width = 500;
  const height = 650;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open(url.toString(), "flowspace-ms-login", `width=${width},height=${height},left=${left},top=${top}`);

  if (!popup) throw new Error("popup-blocked");

  // 팝업이 돌려준 결과(code)를 기다려요.
  // Microsoft 로그인 페이지는 팝업을 원래 창과 분리(COOP)해서 popup.closed·window.opener를 쓸 수 없어요.
  // 그래서 같은 주소(origin)끼리 통하는 BroadcastChannel로 결과를 받아요(callback 페이지가 보내요).
  // 팝업을 그냥 닫았는지는 알 수 없으니, 다시 버튼을 누르면 이전 시도를 취소로 정리하고 일정 시간이 지나도 취소로 봐요.
  pendingCancel?.();

  const result = await new Promise((resolve, reject) => {
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(OAUTH_CHANNEL) : null;
    let timer = null;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      channel?.close();
      clearTimeout(timer);
      if (pendingCancel === cancel) pendingCancel = null;
    };

    const onMessage = (event) => {
      const data = event.data;
      // 시도마다 다른 state로 내 팝업이 보낸 결과만 받아요.
      if (data?.type !== "flowspace-oauth" || data.state !== state) return;
      if (event.origin && event.origin !== window.location.origin && event.origin !== "null") return;
      cleanup();
      resolve(data);
    };

    const cancel = () => {
      cleanup();
      reject(new SocialLoginCancelled());
    };

    pendingCancel = cancel;
    timer = setTimeout(cancel, LOGIN_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
    if (channel) channel.onmessage = (event) => onMessage({ data: event.data, origin: window.location.origin });
  });

  if (result.error) {
    if (result.error === "access_denied") throw new SocialLoginCancelled();
    throw new Error(result.errorDescription || result.error);
  }
  if (result.state !== state || !result.code) throw new Error("state-mismatch");

  // code를 토큰으로 바꿔요(PKCE라 클라이언트 비밀키 없이 verifier로 증명해요).
  const response = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      grant_type: "authorization_code",
      code: result.code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      scope: MS_SCOPE,
    }),
  });
  const tokens = await response.json().catch(() => ({}));

  if (!response.ok || !tokens.id_token) throw new Error(tokens.error_description || "token-exchange");

  if (decodeJwtPayload(tokens.id_token).nonce !== nonce) throw new Error("nonce-mismatch");

  return { idToken: tokens.id_token, accessToken: tokens.access_token ?? "" };
}
