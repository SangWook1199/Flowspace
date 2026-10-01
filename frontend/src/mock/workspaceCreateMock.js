// 워크스페이스 생성 화면의 초기값이에요. 초대 목록(invitedMembers)은 반드시 빈 배열로
// 시작해요 — 예전엔 가짜 팀원 3명이 미리 들어 있어서, 사용자가 아무도 추가하지
// 않아도(심지어 "건너뛰기"를 눌러도) 그 사람들에게 초대가 나가는 구조였어요.
const workspaceCreateMock = {
  name: "",
  initials: "H",
  color: "#4F46E5",

  invitedMembers: [],

  colorPalette: [
    "#4F46E5",
    "#2563EB",
    "#16A34A",
    "#0EA5E9",
    "#F59E0B",
    "#EF4444",
    "#9333EA",
    "#64748B",
  ],
};

export default workspaceCreateMock;
