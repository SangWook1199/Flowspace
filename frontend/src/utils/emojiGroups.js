// 이모지 선택기(페이지 아이콘 · 워크스페이스 아이콘)가 같이 쓰는 이모지 목록과 검색 필터예요.
// 검색이 되려면 이모지마다 찾아볼 키워드가 있어야 해서, 이모지 문자열만
// 나열하는 대신 {emoji, keywords} 객체를 카테고리별로 묶었어요
// (COVER_GROUPS와 같은 {title, icons} 패턴). 동물/자연을 크게 늘리고
// 전체 개수도 78개 → 143개로 늘렸어요.
export const ICON_GROUPS = [
  {
    title: "문서/업무",
    icons: [
      { emoji: "📄", keywords: ["문서", "document", "파일", "file"] },
      { emoji: "📝", keywords: ["메모", "note", "memo", "글"] },
      { emoji: "📋", keywords: ["클립보드", "clipboard", "목록", "list"] },
      { emoji: "📁", keywords: ["폴더", "folder"] },
      { emoji: "🗂️", keywords: ["서류함", "archive", "정리"] },
      { emoji: "📌", keywords: ["압정", "pin", "고정"] },
      { emoji: "📎", keywords: ["클립", "clip", "첨부"] },
      { emoji: "🔖", keywords: ["책갈피", "bookmark"] },
      { emoji: "🧾", keywords: ["영수증", "receipt"] },
    ],
  },
  {
    title: "책/학습",
    icons: [
      { emoji: "📘", keywords: ["책", "book", "파랑", "blue"] },
      { emoji: "📗", keywords: ["책", "book", "초록", "green"] },
      { emoji: "📙", keywords: ["책", "book", "주황", "orange"] },
      { emoji: "📕", keywords: ["책", "book", "빨강", "red"] },
      { emoji: "📚", keywords: ["책", "books", "도서관", "library", "공부", "study"] },
      { emoji: "✏️", keywords: ["연필", "pencil", "쓰기", "write"] },
      { emoji: "🖊️", keywords: ["펜", "pen"] },
      { emoji: "🎓", keywords: ["학사모", "graduation", "졸업", "학습"] },
    ],
  },
  {
    title: "체크/데이터",
    icons: [
      { emoji: "✅", keywords: ["체크", "check", "완료", "done", "할일", "todo"] },
      { emoji: "☑️", keywords: ["체크박스", "checkbox"] },
      { emoji: "📊", keywords: ["막대그래프", "bar chart", "그래프", "graph", "차트"] },
      { emoji: "📈", keywords: ["상승", "그래프", "up", "trend", "성장"] },
      { emoji: "📉", keywords: ["하락", "그래프", "down", "trend", "감소"] },
      { emoji: "🧮", keywords: ["계산기", "calculator", "계산"] },
    ],
  },
  {
    title: "아이디어/디자인",
    icons: [
      { emoji: "💡", keywords: ["아이디어", "idea", "전구", "lightbulb"] },
      { emoji: "🎨", keywords: ["팔레트", "palette", "디자인", "design", "art"] },
      { emoji: "🧩", keywords: ["퍼즐", "puzzle", "piece"] },
      { emoji: "🧪", keywords: ["실험", "test", "테스트", "플라스크"] },
    ],
  },
  {
    title: "프로젝트/보안",
    icons: [
      { emoji: "🔐", keywords: ["자물쇠", "lock", "보안", "security"] },
      { emoji: "🔑", keywords: ["열쇠", "key"] },
      { emoji: "🚀", keywords: ["로켓", "rocket", "출시", "launch"] },
      { emoji: "🎯", keywords: ["타겟", "target", "목표", "goal"] },
      { emoji: "🏁", keywords: ["깃발", "flag", "완료", "finish"] },
      { emoji: "🚩", keywords: ["깃발", "flag"] },
      { emoji: "🏆", keywords: ["트로피", "trophy", "award", "성과"] },
    ],
  },
  {
    title: "개발/도구",
    icons: [
      { emoji: "🐛", keywords: ["버그", "bug"] },
      { emoji: "🛠️", keywords: ["도구", "tools", "설정", "settings"] },
      { emoji: "🔧", keywords: ["렌치", "wrench"] },
      { emoji: "⚙️", keywords: ["톱니바퀴", "gear", "설정", "settings"] },
      { emoji: "💻", keywords: ["노트북", "laptop", "컴퓨터", "computer"] },
      { emoji: "🖥️", keywords: ["데스크탑", "desktop", "pc", "모니터"] },
      { emoji: "⌨️", keywords: ["키보드", "keyboard"] },
      { emoji: "🖱️", keywords: ["마우스", "mouse"] },
    ],
  },
  {
    title: "일정/사람",
    icons: [
      { emoji: "🗓️", keywords: ["달력", "calendar", "일정", "schedule"] },
      { emoji: "📅", keywords: ["달력", "calendar", "일정"] },
      { emoji: "⏰", keywords: ["알람", "alarm", "시계", "clock"] },
      { emoji: "⏳", keywords: ["모래시계", "hourglass", "시간", "time"] },
      { emoji: "👤", keywords: ["사람", "person", "user", "유저"] },
      { emoji: "👥", keywords: ["사람들", "people", "팀", "team"] },
    ],
  },
  {
    title: "반응",
    icons: [
      { emoji: "🔥", keywords: ["불", "fire", "핫", "hot", "인기"] },
      { emoji: "⭐", keywords: ["별", "star", "즐겨찾기", "favorite"] },
      { emoji: "❤️", keywords: ["하트", "heart", "love", "좋아요"] },
      { emoji: "👍", keywords: ["좋아요", "thumbs up", "굿"] },
      { emoji: "🎉", keywords: ["축하", "party", "celebrate", "파티"] },
      { emoji: "🎁", keywords: ["선물", "gift"] },
      { emoji: "🔔", keywords: ["알림", "bell", "notification"] },
    ],
  },
  {
    // 요청받고 크게 늘린 카테고리예요.
    title: "동물",
    icons: [
      { emoji: "🐶", keywords: ["강아지", "개", "dog"] },
      { emoji: "🐱", keywords: ["고양이", "cat"] },
      { emoji: "🐭", keywords: ["쥐", "mouse"] },
      { emoji: "🐹", keywords: ["햄스터", "hamster"] },
      { emoji: "🐰", keywords: ["토끼", "rabbit"] },
      { emoji: "🦊", keywords: ["여우", "fox"] },
      { emoji: "🐻", keywords: ["곰", "bear"] },
      { emoji: "🐼", keywords: ["판다", "panda"] },
      { emoji: "🐨", keywords: ["코알라", "koala"] },
      { emoji: "🐯", keywords: ["호랑이", "tiger"] },
      { emoji: "🦁", keywords: ["사자", "lion"] },
      { emoji: "🐮", keywords: ["소", "cow"] },
      { emoji: "🐷", keywords: ["돼지", "pig"] },
      { emoji: "🐸", keywords: ["개구리", "frog"] },
      { emoji: "🐵", keywords: ["원숭이", "monkey"] },
      { emoji: "🐔", keywords: ["닭", "chicken"] },
      { emoji: "🐧", keywords: ["펭귄", "penguin"] },
      { emoji: "🐦", keywords: ["새", "bird"] },
      { emoji: "🦆", keywords: ["오리", "duck"] },
      { emoji: "🦉", keywords: ["부엉이", "올빼미", "owl"] },
      { emoji: "🐺", keywords: ["늑대", "wolf"] },
      { emoji: "🐴", keywords: ["말", "horse"] },
      { emoji: "🦄", keywords: ["유니콘", "unicorn"] },
      { emoji: "🐢", keywords: ["거북이", "turtle"] },
      { emoji: "🐍", keywords: ["뱀", "snake"] },
      { emoji: "🐙", keywords: ["문어", "octopus"] },
      { emoji: "🦀", keywords: ["게", "crab"] },
      { emoji: "🐠", keywords: ["물고기", "fish"] },
      { emoji: "🐬", keywords: ["돌고래", "dolphin"] },
      { emoji: "🐳", keywords: ["고래", "whale"] },
      { emoji: "🦈", keywords: ["상어", "shark"] },
      { emoji: "🦋", keywords: ["나비", "butterfly"] },
      { emoji: "🐝", keywords: ["벌", "bee"] },
      { emoji: "🐞", keywords: ["무당벌레", "ladybug"] },
    ],
  },
  {
    title: "자연/날씨",
    icons: [
      { emoji: "🌱", keywords: ["새싹", "plant", "sprout", "새로시작"] },
      { emoji: "🌳", keywords: ["나무", "tree"] },
      { emoji: "🌲", keywords: ["나무", "소나무", "tree"] },
      { emoji: "🌵", keywords: ["선인장", "cactus"] },
      { emoji: "🍀", keywords: ["네잎클로버", "clover", "행운"] },
      { emoji: "🌸", keywords: ["꽃", "flower"] },
      { emoji: "🌻", keywords: ["해바라기", "sunflower"] },
      { emoji: "🌹", keywords: ["장미", "rose"] },
      { emoji: "☀️", keywords: ["해", "sun", "날씨", "weather"] },
      { emoji: "🌙", keywords: ["달", "moon", "밤", "night"] },
      { emoji: "⛅", keywords: ["구름", "cloud", "날씨", "weather"] },
      { emoji: "🌈", keywords: ["무지개", "rainbow"] },
      { emoji: "❄️", keywords: ["눈", "snow", "겨울"] },
      { emoji: "🌊", keywords: ["파도", "wave", "바다", "sea"] },
      { emoji: "🏔️", keywords: ["산", "mountain"] },
    ],
  },
  {
    title: "음식",
    icons: [
      { emoji: "☕", keywords: ["커피", "coffee"] },
      { emoji: "🍕", keywords: ["피자", "pizza", "음식", "food"] },
      { emoji: "🍎", keywords: ["사과", "apple", "과일", "fruit"] },
      { emoji: "🍔", keywords: ["버거", "burger", "햄버거"] },
      { emoji: "🍰", keywords: ["케이크", "cake"] },
      { emoji: "🍜", keywords: ["라면", "국수", "noodle"] },
      { emoji: "🍺", keywords: ["맥주", "beer"] },
    ],
  },
  {
    title: "사물/이동",
    icons: [
      { emoji: "📦", keywords: ["박스", "box", "package", "배송"] },
      { emoji: "💰", keywords: ["돈", "money", "예산", "budget"] },
      { emoji: "💳", keywords: ["카드", "card", "결제", "payment"] },
      { emoji: "🧭", keywords: ["나침반", "compass", "방향"] },
      { emoji: "🗺️", keywords: ["지도", "map"] },
      { emoji: "✈️", keywords: ["비행기", "plane", "여행", "travel"] },
      { emoji: "🚗", keywords: ["자동차", "car"] },
      { emoji: "🏠", keywords: ["집", "home", "house"] },
      { emoji: "🏢", keywords: ["건물", "building", "office", "회사"] },
    ],
  },
  {
    title: "기호",
    icons: [
      { emoji: "⚡", keywords: ["번개", "lightning", "빠름", "fast"] },
      { emoji: "🔒", keywords: ["잠금", "lock", "locked"] },
      { emoji: "🔓", keywords: ["잠금해제", "unlock", "unlocked"] },
      { emoji: "🔄", keywords: ["새로고침", "refresh", "sync", "동기화"] },
      { emoji: "⚠️", keywords: ["경고", "warning", "alert", "주의"] },
      { emoji: "❓", keywords: ["물음표", "question", "질문"] },
      { emoji: "❗", keywords: ["느낌표", "exclaim", "중요", "important"] },
    ],
  },
];

// 슬래시 메뉴 필터링(filterBlockTypes)과 같은 방식 — 공백 지우고
// 소문자로 맞춰서 이모지 자체 문자나 한글/영문 키워드 아무거나로
// 검색돼요.
function normalizeIconQuery(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

// 검색어가 없으면 카테고리를 그대로 두고, 있으면 카테고리별로 걸러서
// 일치하는 아이콘이 하나도 없는 카테고리는 통째로 숨겨요(빈 라벨만
// 남는 걸 방지).
export function filterIconGroups(groups, query) {
  const q = normalizeIconQuery(query);
  if (!q) return groups;

  return groups
    .map((group) => ({
      ...group,
      icons: group.icons.filter((item) => {
        const candidates = [item.emoji, ...(item.keywords || [])].map(normalizeIconQuery);
        return candidates.some((c) => c.includes(q));
      }),
    }))
    .filter((group) => group.icons.length > 0);
}
