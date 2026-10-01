import { useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Camera, ChevronRight, ImagePlus, Smile, X } from "lucide-react";

import BlockEditor from "../components/page/BlockEditor";
import PopoverPortal from "../components/page/PopoverPortal";
import { useWorkspace } from "../context/WorkspaceContext";
import "../styles/page-detail.css";

// 검색이 되려면 이모지마다 찾아볼 키워드가 있어야 해서, 이모지 문자열만
// 나열하는 대신 {emoji, keywords} 객체를 카테고리별로 묶었어요
// (COVER_GROUPS와 같은 {title, icons} 패턴). 동물/자연을 크게 늘리고
// 전체 개수도 78개 → 143개로 늘렸어요.
const ICON_GROUPS = [
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
function filterIconGroups(groups, query) {
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

// 백엔드 static/covers에 있는 기본 커버 16장. Vite가 frontend/public을
// 루트 경로로 서빙해서 지금은 /covers/*.png 로 바로 접근되고, 나중에
// 백엔드 정적 리소스로 붙여도 같은 경로라 이 문자열을 안 바꿔도 돼요.
// 피커에서는 사진(배경)과 단색 파스텔(색상)을 섹션으로 나눠서 보여줘요.
const COVER_GROUPS = [
  {
    title: "배경",
    choices: [
      { label: "해변", url: "/covers/beach.png" },
      { label: "책상", url: "/covers/desk.png" },
      { label: "호수", url: "/covers/lake.png" },
      { label: "산", url: "/covers/mountain.png" },
      { label: "비 오는 창가", url: "/covers/rainy-window.png" },
      { label: "방", url: "/covers/room.png" },
      { label: "하늘", url: "/covers/sky.png" },
      { label: "파스텔 스카이", url: "/covers/pastel-sky.png" },
      { label: "우주", url: "/covers/space.png" },
    ],
  },
  {
    title: "색상",
    choices: [
      { label: "파스텔 블루", url: "/covers/pastel-blue.png" },
      { label: "파스텔 그레이", url: "/covers/pastel-gray.png" },
      { label: "파스텔 그린", url: "/covers/pastel-green.png" },
      { label: "파스텔 라벤더", url: "/covers/pastel-lavender.png" },
      { label: "파스텔 민트", url: "/covers/pastel-mint.png" },
      { label: "파스텔 핑크", url: "/covers/pastel-pink.png" },
      { label: "파스텔 옐로우", url: "/covers/pastel-yellow.png" },
    ],
  },
];

export default function PageDetailPage() {
  // 실제로는 pages/{pageId} + pages/{pageId}/blocks API로 교체.
  // 지금은 WorkspaceProvider가 들고 있는 세션 상태(pages/setPages)를
  // MainLayout의 Outlet context로 받아서 씁니다 — 여러 페이지를 오가도, 새 페이지를
  // 만들어도 사이드바와 바로 동기화돼요.
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { pages, setPages, createPage, duplicatePage, deletePage, restorePage, renamePage, sprintTasks, toggleSubtask } =
    useOutletContext();
  const { currentWorkspaceId } = useWorkspace();

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverAnchor, setCoverAnchor] = useState(null);
  const coverInputRef = useRef(null);

  // :pageId는 URL에서 온 문자열이라 숫자가 아닐 수도 있어요("abc", "NaN", "1.5" 등).
  // 정수로 딱 떨어지는 값만 페이지 id로 보고, 아니면 찾지 못한 걸로 처리해요.
  // 지금 워크스페이스에 속한 페이지만 보여줘요 — 주소창에 다른 워크스페이스의 페이지
  // id가 남아 있어도(뒤로가기 등) 이전 워크스페이스의 내용이 그대로 뜨지 않게요.
  const numericId = Number(pageId);
  const page = Number.isInteger(numericId)
    ? pages.find(
        (p) =>
          p.id === numericId && (p.workspaceId ?? 1) === currentWorkspaceId,
      )
    : undefined;

  if (!page) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing">
          페이지를 찾을 수 없어요. <Link to="/">홈으로 돌아가기</Link>
        </p>
      </div>
    );
  }

  // 휴지통에 있는 페이지는 편집할 수 없게 해요. 주소로 직접 들어오거나 열어둔 채로
  // 삭제했을 때 에디터가 그대로 떠서 "삭제된 페이지"를 계속 고칠 수 있었어요.
  // 복원하면 trashedAt이 지워지면서 바로 에디터가 나타나요.
  if (page.trashedAt) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing">이 페이지는 휴지통에 있어요</p>
        <button
          type="button"
          className="page-detail__cover-btn"
          style={{ margin: "0 auto" }}
          onClick={() => restorePage(page.id)}
        >
          복원
        </button>
      </div>
    );
  }

  const updatePage = (patch) => {
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, ...patch } : p)));
  };

  // breadcrumb: 바로 위 부모만이 아니라 최상위까지 전체 경로를 보여줘요.
  const ancestors = [];
  let cursor = page.parentPageId ? pages.find((p) => p.id === page.parentPageId) : null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = cursor.parentPageId ? pages.find((p) => p.id === cursor.parentPageId) : null;
  }

  const handleCoverSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePage({ cover: reader.result });
    reader.readAsDataURL(file);
  };

  // 페이지 삭제 버튼은 일단 화면에서 뺐어요(요청으로 임시 제거) —
  // deletePage(page.id)를 부르는 handleDeletePage 같은 함수만 없앴을
  // 뿐, deletePage 자체(휴지통 이동 로직)는 WorkspaceProvider에 그대로 있어서
  // 나중에 버튼을 다시 붙이기만 하면 바로 복원돼요.

  const closeIconPicker = () => {
    setIconPickerOpen(false);
    setIconQuery("");
  };

  const filteredIconGroups = filterIconGroups(ICON_GROUPS, iconQuery);

  // 아이콘 피커 — 검색창 + 카테고리별로 묶인 스크롤 목록. 예전엔 24개뿐이라
  // 검색도 카테고리도 필요 없었는데, 143개로 늘면서 원하는 아이콘을 찾기
  // 어려워져서 슬래시 메뉴(filterBlockTypes)와 같은 방식으로 검색을
  // 붙이고, COVER_GROUPS처럼 카테고리 섹션으로도 나눴어요. 검색 중엔
  // 일치하는 아이콘이 있는 카테고리만 남아요.
  const iconPickerPanel = iconPickerOpen ? (
    <>
      <div className="page-detail__icon-overlay" onClick={closeIconPicker} />
      <div className="page-detail__icon-picker">
        <input
          type="text"
          className="page-detail__icon-search"
          placeholder="아이콘 검색"
          value={iconQuery}
          onChange={(e) => setIconQuery(e.target.value)}
          autoFocus
        />

        <div className="page-detail__icon-picker-groups">
          {filteredIconGroups.length === 0 ? (
            <p className="page-detail__icon-empty">검색 결과가 없어요.</p>
          ) : (
            filteredIconGroups.map((group) => (
              <div key={group.title} className="page-detail__icon-picker-section">
                <span className="page-detail__icon-picker-label">{group.title}</span>
                <div className="page-detail__icon-picker-grid">
                  {group.icons.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      title={item.keywords?.[0]}
                      onClick={() => {
                        updatePage({ icon: item.emoji });
                        closeIconPicker();
                      }}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  ) : null;

  // "커버 추가"/"변경" 버튼 둘 다 이 패널을 열어요 — 기본 커버 16장을
  // 고르거나 업로드를 선택할 수 있어요. 커버가 있을 때(변경 버튼)는
  // .page-detail__cover-zone에 overflow:hidden(280px 고정 높이)이
  // 걸려 있어서 예전처럼 그 안에서 absolute로 띄우면 패널이 바닥
  // 밑으로 넘쳐 그대로 잘려 안 보였어요 — PopoverPortal(다른 메뉴들과
  // 같은 컴포넌트)로 document.body에 fixed로 띄워서 그 문제를
  // 없앴어요. align="end"는 예전 CSS의 right:0 의도 그대로 트리거
  // 오른쪽 끝에 패널 오른쪽 끝을 맞춰요. 두 버튼 중 실제로 클릭된
  // 쪽을 anchorEl로 써야 해서, 클릭 시 e.currentTarget을 coverAnchor에
  // 같이 저장해요.
  const coverPickerPanel = coverPickerOpen ? (
    <PopoverPortal anchorEl={coverAnchor} onClose={() => setCoverPickerOpen(false)} align="end">
      <div className="page-detail__cover-picker">
        {COVER_GROUPS.map((group) => (
          <div key={group.title} className="page-detail__cover-picker-section">
            <span className="page-detail__cover-picker-label">{group.title}</span>
            <div className="page-detail__cover-picker-grid">
              {group.choices.map((choice) => (
                <button
                  key={choice.url}
                  type="button"
                  className="page-detail__cover-thumb"
                  title={choice.label}
                  onClick={() => {
                    updatePage({ cover: choice.url });
                    setCoverPickerOpen(false);
                  }}
                >
                  <img src={choice.url} alt={choice.label} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="page-detail__cover-upload-btn"
          onClick={() => {
            setCoverPickerOpen(false);
            coverInputRef.current?.click();
          }}
        >
          <ImagePlus size={14} />
          업로드
        </button>
      </div>
    </PopoverPortal>
  ) : null;

  return (
    <div className="page-detail-page">
      {/* 커버는 노션처럼 일반 흐름(in-flow) 요소예요 — 있으면 그만큼
          아래 내용이 실제로 밀려요. 상위 페이지 경로/삭제 같은 상단
          바는 노션엔 없는 이 앱만의 기능이라, 문서 흐름을 차지하지
          않게 커버(또는 커버가 없으면 페이지 맨 위) 위에 떠 있는
          오버레이로 뒀어요 — 그래야 아이콘이 항상 "커버 바로 아래"에서
          시작해서 커버에 겹칠 수 있어요. */}
      {page.cover && (
        <div className="page-detail__cover-zone">
          <img src={page.cover} alt="" />
          <div
            className={`page-detail__cover-actions${
              coverPickerOpen ? " page-detail__cover-actions--open" : ""
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                setCoverAnchor(e.currentTarget);
                setCoverPickerOpen((v) => !v);
              }}
            >
              <Camera size={13} />
              변경
            </button>
            <button type="button" onClick={() => updatePage({ cover: null })}>
              <X size={13} />
              삭제
            </button>

            {coverPickerPanel}
          </div>
        </div>
      )}

      <div className="page-detail__topbar-zone">
        <div className="page-detail__container page-detail__topbar">
          {ancestors.length > 0 ? (
            <div className="page-detail__breadcrumb page-detail__topbar-surface">
              {ancestors.map((a) => (
                <span key={a.id} className="page-detail__breadcrumb-seg">
                  <button type="button" onClick={() => navigate(`/pages/${a.id}`)}>
                    <span>{a.icon}</span>
                    <span>{a.title || "제목 없음"}</span>
                  </button>
                  <ChevronRight size={12} />
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}

          {/* 삭제 버튼은 일단 빼뒀어요. 커버가 없을 때만 여기(상단
              바)에 "커버 추가"가 남아요 — 커버가 있을 때는 커버 사진
              자체에 hover하면 변경/삭제가 나와요(노션 방식). */}
          {!page.cover && (
            <div className="page-detail__topbar-actions page-detail__topbar-surface">
              <div className="page-detail__cover-btn-wrap">
                <button
                  type="button"
                  className="page-detail__cover-btn"
                  onClick={(e) => {
                    setCoverAnchor(e.currentTarget);
                    setCoverPickerOpen((v) => !v);
                  }}
                >
                  <ImagePlus size={13} />
                  커버 추가
                </button>

                {coverPickerPanel}
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleCoverSelect(e.target.files?.[0])}
      />

      <div
        className={`page-detail__container page-detail__container--body${
          page.cover ? " page-detail__container--body--with-cover" : ""
        }`}
      >
        <div className="page-detail__head">
          <div
            className={`page-detail__icon-wrap${
              page.cover ? " page-detail__icon-wrap--overlap" : ""
            }`}
          >
            <button
              type="button"
              className="page-detail__icon"
              onClick={() => {
                setIconPickerOpen((v) => !v);
                setIconQuery("");
              }}
            >
              {page.icon || <Smile size={26} />}
            </button>

            {iconPickerPanel}
          </div>

          <input
            className="page-detail__title"
            value={page.title}
            placeholder="제목 없음"
            onChange={(e) => updatePage({ title: e.target.value })}
          />
        </div>

        <BlockEditor
          key={page.id}
          blocks={page.blocks}
          onChange={(blocks) => updatePage({ blocks })}
          pages={pages}
          onCreateChildPage={() => createPage(page.id)}
          onDuplicatePage={(pageId) => duplicatePage(pageId, page.id)}
          onRenameRowPage={renamePage}
          onDeleteRowPage={deletePage}
          sprintTasks={sprintTasks}
          onToggleSubtask={toggleSubtask}
        />
      </div>
    </div>
  );
}
