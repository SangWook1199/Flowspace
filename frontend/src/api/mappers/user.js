import { fileUrl } from "../../utils/fileUrl";
import { getInitial } from "../../utils/initial";

// 서버 UserResponse → 화면에서 쓰는 user.
// 기존 필드(userId, nickname, email …)는 그대로 두고, 화면이 쓰는 id·initial과
// 절대 주소로 바꾼 profileImageUrl을 더해요. 이미 변환된 값을 다시 넣어도 결과가
// 같아서(멱등) 어디서 호출해도 안전해요.
// 이메일 찾기(워크스페이스 초대용) 응답 → 화면용. status: AVAILABLE(초대 가능) | MEMBER(이미 멤버) | INVITED(이미 초대함) | SELF(나)
export const toLookupUser = (dto) => ({
  id: dto.userId,
  name: dto.nickname,
  email: dto.email,
  initial: getInitial(dto.nickname),
  profileImageUrl: fileUrl(dto.profileImageUrl),
  status: dto.status,
});

export function toUser(dto) {
  if (!dto) return null;

  return {
    ...dto,
    id: dto.userId ?? dto.id,
    initial: getInitial(dto.nickname),
    profileImageUrl: fileUrl(dto.profileImageUrl),
  };
}
