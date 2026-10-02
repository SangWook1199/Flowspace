const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";

// "로그인 상태 유지"를 켜면 localStorage(브라우저를 닫아도 남아요),
// 끄면 sessionStorage(탭을 닫으면 사라져요)에 저장해요.
// 접근은 사생활 보호 모드나 저장소 차단 환경에서 예외를 던질 수 있어요.
// 그때 앱 전체가 죽지 않도록, 읽기/쓰기를 전부 여기서 감싸서
// "토큰이 없는 상태"처럼 조용히 동작하게 해요.
const storageOf = (kind) => {
  try {
    return kind === "session" ? sessionStorage : localStorage;
  } catch {
    return null;
  }
};

const readFrom = (kind, key) => {
  try {
    return storageOf(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const safeGet = (key) => readFrom("local", key) ?? readFrom("session", key);

// 지금 토큰이 들어 있는 저장소("local" | "session"). 없으면 null.
const currentKind = () => {
  if (readFrom("local", REFRESH_TOKEN) || readFrom("local", ACCESS_TOKEN)) return "local";
  if (readFrom("session", REFRESH_TOKEN) || readFrom("session", ACCESS_TOKEN)) return "session";
  return null;
};

const removeFrom = (kind) => {
  try {
    const storage = storageOf(kind);
    storage?.removeItem(ACCESS_TOKEN);
    storage?.removeItem(REFRESH_TOKEN);
  } catch {
    // 지울 수 없으면 어쩔 수 없이 그대로 두고 넘어가요.
  }
};

// remember: true=로그인 상태 유지, false=이번 탭에서만, 생략=지금 쓰는 저장소 그대로(토큰 재발급 때).
// 응답에 accessToken이 없는데 그대로 setItem하면 문자열 "undefined"가 저장돼서,
// 다음 요청부터 "Bearer undefined"가 나가요. 그래서 값이 있을 때만 저장해요.
export const saveTokens = ({ accessToken, refreshToken }, { remember } = {}) => {
  const kind = remember === undefined ? (currentKind() ?? "local") : remember ? "local" : "session";

  // 저장소를 바꿔 로그인했다면 이전 저장소에 남은 토큰은 지워요(오래된 토큰이 읽히지 않게).
  removeFrom(kind === "local" ? "session" : "local");

  try {
    const storage = storageOf(kind);

    if (accessToken) {
      storage?.setItem(ACCESS_TOKEN, accessToken);
    }

    if (refreshToken) {
      storage?.setItem(REFRESH_TOKEN, refreshToken);
    }
  } catch {
    // 저장 실패 시엔 이번 세션 동안만 로그인 상태가 유지되지 않을 뿐이에요.
  }
};

export const getAccessToken = () => safeGet(ACCESS_TOKEN);

// 401이 났을 때 access token을 다시 발급받는 데 써요(api/client.js).
export const getRefreshToken = () => safeGet(REFRESH_TOKEN);

export const clearTokens = () => {
  removeFrom("local");
  removeFrom("session");
};
