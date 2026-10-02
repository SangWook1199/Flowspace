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

// 비밀번호 변경. 응답으로 이 기기용 새 토큰이 와요(다른 기기의 로그인은 풀려요).
export const changePassword = (data) => client.put("/auth/me/password", data);

// 프로필 수정
export const updateProfile = (formData) =>
  client.patch("/auth/me/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// 프로필 삭제
export const deleteProfileImage = () => client.delete("/auth/me/profile/image");

// 탈퇴하면 내 워크스페이스가 어떻게 되는지(탈퇴 가능 여부 포함) 미리 확인
export const getWithdrawCheck = async () => {
  const { data } = await client.get("/auth/me/withdraw-check");
  return data;
};

// 회원 탈퇴. 이메일 계정은 { password }, 소셜 계정은 { confirmEmail }로 본인을 확인해요.
export const withdraw = (data) => client.post("/auth/me/withdraw", data);
