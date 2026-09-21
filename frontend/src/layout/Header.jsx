import * as Icons from "lucide-react";
import styles from "../styles/classes.js";
import { getAvatarTone } from "../utils/avatarColor.js";

// 검색창은 아직 실제로 입력이 안 되는 장식용이에요(진짜 검색은 API
// 연결 때). 예전엔 오른쪽에 단축키 힌트("⌘K" → "Ctrl K" → "검색")가
// 붙어있었는데, 그건 실제로 동작하지도 않는데 마치 버튼처럼 보여서
// 헷갈린다고 해서 그 부분만 뺐어요 — 검색창 자체(아이콘 + 텍스트)는
// 화면 구성상 유지해요. 온라인 팀원은 원래 사이드바 맨 아래에
// 있었는데, 페이지 폭을 넓히면서 헤더의 빈 공간을 채우려고 그
// 자리로 옮겼어요(사이드바 그 자리엔 워크스페이스 설정 버튼이
// 대신 들어감). 순서는 벨 다음, 프로필 앞이에요.
export default function Header({ members = [] }) {
  const onlineCount = members.filter((member) => member.online).length;
  // 로그인 연동 전이라 "지금 로그인한 사람 = 상욱"을 members에서 찾아
  // 쓰고 있어요. 나중에 실제 로그인 API가 붙으면 여기가 AuthContext의
  // user로 바뀔 거예요.
  const currentUser = members.find((member) => member.name === "상욱");

  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <Icons.Search size={18} />
        <span>검색</span>
      </div>

      <div className={styles.headerRight}>
        <button className={styles.bell}>
          <Icons.Bell />
          <i />
        </button>

        <div className={styles.headerMembers}>
          <small>
            <em /> {onlineCount} / {members.length}
          </small>

          <div>
            {members.map((member) => (
              <span
                key={member.id}
                className={`${styles.avatar} ${styles[getAvatarTone(member.id)]}`}
              >
                {member.initial}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.profile}>
          <span
            className={`${styles.avatar} ${styles[getAvatarTone(currentUser?.id)]}`}
          >
            {currentUser?.initial ?? "상"}
          </span>
          <b>{currentUser?.name ?? "상욱"}</b>
          <Icons.ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
