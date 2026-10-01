// 서버는 파일을 /uploads/x.png, /covers/x.png 같은 상대경로로 내려줘요.
// 화면(5173)과 서버(8080) 주소가 달라서 서버 주소를 붙여 절대 주소로 바꿔요.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const SERVER_ORIGIN = (
  import.meta.env.VITE_SERVER_ORIGIN || API_BASE_URL.replace(/\/api\/?$/, "")
).replace(/\/$/, "");

export function fileUrl(path) {
  if (!path) return null;

  // 이미 절대 주소(외부 이미지, data:, blob:)면 그대로 써요.
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  return `${SERVER_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
