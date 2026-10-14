// 로그인한 사용자의 닉네임을 알 수 없을 때(드문 경우)만 쓰는 대신 이름이에요.
// 평소에는 AuthContext의 user.nickname을 써요(댓글 작성자 표시와 "본인 댓글인지" 판단 모두).
export const CURRENT_USER_NAME = "나";

// 댓글 시각을 "9월 30일 오후 03:12"처럼 짧게 보여줘요(잘못된 날짜면 빈 문자열).
export function formatCommentTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
