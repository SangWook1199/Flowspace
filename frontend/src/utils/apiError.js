// 서버 오류를 화면에 보여줄 한 문장으로 정리해요.
// 서버(GlobalExceptionHandler)는 오류를 { status, code, message }로 내려줘요.
export const NETWORK_ERROR_MESSAGE =
  "서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.";

const DEFAULT_ERROR_MESSAGE = "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";

// 우선순위: 네트워크 오류 → 서버가 준 message → 호출한 쪽이 넘긴 fallback → 기본 문구.
// fallback은 "로그인에 실패했어요"처럼 화면에 맞는 문구를 쓰고 싶을 때 넘겨요.
export function getErrorMessage(error, fallback) {
  if (!error?.response) {
    // 요청 취소처럼 응답이 없어도 네트워크 오류가 아닌 경우는 그대로 fallback.
    return error?.code === "ERR_CANCELED" ? (fallback ?? DEFAULT_ERROR_MESSAGE) : NETWORK_ERROR_MESSAGE;
  }

  const message = error.response.data?.message;

  if (typeof message === "string" && message.trim() !== "") return message;

  return fallback ?? DEFAULT_ERROR_MESSAGE;
}

// 서버가 준 오류 코드(예: EMAIL_ALREADY_EXISTS). 없으면 null.
export const getErrorCode = (error) => error?.response?.data?.code ?? null;
