import { createContext, useContext } from "react";

const MemberProfileContext = createContext(null);

export default MemberProfileContext;

// 멤버의 아바타·이름을 눌렀을 때 프로필 카드를 여는 함수예요: open(userId, 눌린 요소).
// 카드를 그릴 Provider가 없는 화면에서는 아무 일도 하지 않아서, 어디서 써도 안전해요.
export function useMemberProfile() {
  return useContext(MemberProfileContext)?.open ?? noop;
}

const noop = () => {};
