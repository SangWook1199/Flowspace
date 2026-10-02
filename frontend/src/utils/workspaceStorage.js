// 마지막으로 보던 워크스페이스를 사용자별로 기억해요(새로고침해도 같은 곳에서 시작).
// localStorage가 막힌 환경에서도 앱이 죽지 않게 전부 try/catch로 감싸요.
const keyOf = (userId) => `flowspace:currentWorkspace:${userId}`;

export const getSavedWorkspaceId = (userId) => {
  try {
    const value = Number(localStorage.getItem(keyOf(userId)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const saveWorkspaceId = (userId, workspaceId) => {
  try {
    localStorage.setItem(keyOf(userId), String(workspaceId));
  } catch {
    // 저장하지 못하면 다음에 첫 번째 워크스페이스에서 시작할 뿐이에요.
  }
};
