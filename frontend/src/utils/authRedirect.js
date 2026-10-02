// 로그인 후 "원래 가려던 곳"으로 돌려보낼 때 쓰는 주소 검사예요.
// location.state는 우리 앱이 넣은 값이지만, 외부에서 주소를 만들어
// 유도하는 오픈 리다이렉트를 막으려고 앱 내부 경로일 때만 믿어요.
// - 반드시 "/"로 시작
// - "//evil.com"(프로토콜 상대 URL)과 "/\\evil.com"(브라우저가 //로 해석)은 거부
// - /login, /signup으로 다시 돌려보내면 의미 없는 루프라서 제외
export function getSafeRedirect(from) {
  if (typeof from !== "string") return null;
  if (!from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return null;
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(from)) return null;

  const path = from.split(/[?#]/)[0];
  if (path === "/login" || path === "/signup") return null;

  return from;
}
