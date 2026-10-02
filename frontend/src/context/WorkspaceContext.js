import { createContext, useContext } from "react";

const WorkspaceContext = createContext(null);

export default WorkspaceContext;

// Provider 밖에서 쓰면 조용히 undefined 에러가 나는 대신, 무엇을 놓쳤는지 바로
// 알 수 있게 분명한 에러를 던져요. (AuthContext는 null을 그대로 돌려주지만,
// 워크스페이스 상태는 사이드바·페이지·생성 화면이 전부 의존해서 없으면 앱이
// 아예 동작하지 않으니까 빨리 실패하는 편이 디버깅이 쉬워요.)
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspace는 <WorkspaceProvider> 안에서만 쓸 수 있어요. App.jsx에서 Routes를 <WorkspaceProvider>(AuthProvider 안쪽)로 감싸 주세요.",
    );
  }
  return ctx;
}
