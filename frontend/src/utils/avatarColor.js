// users 테이블(DDL) 봤을 때 아바타 색 컬럼이 따로 없어서, 프로필 아이콘이
// 없는 유저는 이름 첫 글자를 원형 아바타로 대신 보여주되 배경색은
// user_id를 해시해서 고정 팔레트 중 하나로 결정론적으로 골라요
// (Slack/GitHub/Notion이 쓰는 방식). DB에 색을 저장하거나 계산하는
// 백엔드 로직 없이도, 같은 유저는 항상 같은 색으로 나와요.
//
// 지금까지 mock 데이터마다 tone/color를 직접 손으로 넣다 보니(예:
// mock/dashboard.js의 민수가 tone:"green"인데 실제 CSS엔 .green이
// 없어서 조용히 기본색으로 떨어지는 식) 값이 어긋나는 일이 있었는데,
// 이제 이 함수 하나로만 색을 정하면 그런 불일치가 애초에 생기지 않아요.
export const AVATAR_TONES = ["blue", "green", "purple", "gray", "orange", "pink"];

export function getAvatarTone(userId) {
  if (userId === null || userId === undefined) return "gray";

  const n =
    typeof userId === "number" && Number.isFinite(userId)
      ? userId
      : hashString(String(userId));

  const index = ((n % AVATAR_TONES.length) + AVATAR_TONES.length) % AVATAR_TONES.length;
  return AVATAR_TONES[index];
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}
