// 워크스페이스 역할: 소유자(OWNER) > 관리자(ADMIN) > 멤버(MEMBER). 서버도 같은 규칙으로 막아요.
//  - 멤버: 페이지·작업·일정 만들기/고치기, 페이지를 휴지통으로 보내기(복원 가능)
//  - 관리자: + 멤버 초대·추방(일반 멤버만), 휴지통 영구 삭제·비우기, 스프린트·칸반 상태 삭제
//  - 소유자: + 역할 변경, 소유권 이전, 워크스페이스 수정·삭제
const ROLE_LABELS = { OWNER: "소유자", ADMIN: "관리자", MEMBER: "멤버" };

export const roleLabel = (role) => ROLE_LABELS[role] ?? ROLE_LABELS.MEMBER;

// 관리자 이상인지(초대·추방·되돌릴 수 없는 삭제를 할 수 있는지)
export const isAdminOrOwner = (role) => role === "OWNER" || role === "ADMIN";
