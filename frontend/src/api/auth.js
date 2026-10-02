import client from "./client";

// 이메일 회원가입
export const signup = (data) => client.post("/auth/signup", data);

// 이메일 로그인
export const login = (data) => client.post("/auth/login", data);

// Google 로그인
export const googleLogin = (idToken) =>
  client.post("/auth/google", { idToken });

// Microsoft 로그인
export const microsoftLogin = (data) => client.post("/auth/microsoft", data);

// access token 재발급. 만료된 access token을 실어 보내봐야 의미가 없고
// 오히려 헷갈리니까 Authorization 헤더는 붙이지 않도록(skipAuth) 표시해요.
// 401이 나도 또 refresh를 시도하지 않는 건 client.js의 인터셉터가
// /auth/refresh 주소를 보고 걸러줘요.
export const refresh = (refreshToken) =>
  client.post("/auth/refresh", { refreshToken }, { skipAuth: true });

// 내 정보 조회
export const getMe = () => client.get("/auth/me");

// 프로필 수정
export const updateProfile = (formData) =>
  client.patch("/auth/me/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// 프로필 삭제
export const deleteProfileImage = () => client.delete("/auth/me/profile/image");
