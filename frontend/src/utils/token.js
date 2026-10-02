const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";

// localStorage 접근은 사생활 보호 모드나 저장소 차단 환경에서 예외를
// 던질 수 있어요. 그때 앱 전체가 죽지 않도록, 읽기/쓰기를 전부 여기서
// 감싸서 "토큰이 없는 상태"처럼 조용히 동작하게 해요.
const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const saveTokens = ({ accessToken, refreshToken }) => {
  try {
    // 응답에 accessToken이 없는데 그대로 setItem하면 문자열 "undefined"가
    // 저장돼서, 다음 요청부터 "Bearer undefined"가 나가요. 그래서 값이
    // 있을 때만 저장해요.
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN, accessToken);
    }

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN, refreshToken);
    }
  } catch {
    // 저장 실패 시엔 이번 세션 동안만 로그인 상태가 유지되지 않을 뿐이에요.
  }
};

export const getAccessToken = () => safeGet(ACCESS_TOKEN);

// 401이 났을 때 access token을 다시 발급받는 데 써요(api/client.js).
export const getRefreshToken = () => safeGet(REFRESH_TOKEN);

export const clearTokens = () => {
  try {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
  } catch {
    // 지울 수 없으면 어쩔 수 없이 그대로 두고 넘어가요.
  }
};
