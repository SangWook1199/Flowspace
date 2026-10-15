// 서버 주소 설정을 한 곳에서 읽어요(api/client.js · utils/fileUrl.js · utils/notificationSocket.js가 같이 써요).
//  - VITE_API_BASE_URL: 백엔드 API 주소(끝에 /api 포함). 배포 때는 반드시 .env.production 등으로 넣어 주세요.
//  - VITE_SERVER_ORIGIN: 업로드 이미지(/uploads/…, /covers/…)를 불러올 서버 주소. 비우면 위 주소에서 끝의 /api를 뗀 값을 써요.
// 개발 서버에서만 localhost:8080으로 떨어져요. 배포 빌드에서 값이 없으면 같은 주소의 /api(리버스 프록시)를 쓰고 경고를 남겨서,
// 배포한 화면이 말없이 사용자 PC의 localhost를 부르는 일이 없게 해요.
const configured = import.meta.env.VITE_API_BASE_URL;

if (!configured && import.meta.env.PROD) {
  console.warn("VITE_API_BASE_URL이 설정되지 않아 같은 주소의 /api로 요청해요. 배포 환경 변수를 확인해 주세요.");
}

export const API_BASE_URL = configured || (import.meta.env.PROD ? "/api" : "http://localhost:8080/api");

export const SERVER_ORIGIN = (import.meta.env.VITE_SERVER_ORIGIN || API_BASE_URL.replace(/\/api\/?$/, "")).replace(/\/$/, "");
