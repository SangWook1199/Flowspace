const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";

export const saveTokens = ({ accessToken, refreshToken }) => {
  localStorage.setItem(ACCESS_TOKEN, accessToken);

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN, refreshToken);
  }
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN);

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
};
