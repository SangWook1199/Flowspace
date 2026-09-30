// 로그인 연동 전이라(Header.jsx와 같은 이유) "지금 로그인한 사람 = 상욱"을
// 그대로 써요 — 댓글 작성자 표시뿐 아니라 "본인 댓글인지" 판단(⋯ 메뉴의
// 수정/삭제 노출 여부)에도 이 값을 기준으로 삼아요. 실제 로그인 API가
// 붙으면 여기가 AuthContext의 user로 바뀔 거예요.
export const CURRENT_USER_NAME = "상욱";

// 댓글 시각을 "9월 30일 오후 03:12"처럼 짧게 보여줘요(잘못된 날짜면 빈 문자열).
export function formatCommentTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
