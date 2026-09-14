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
