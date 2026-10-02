import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import styles from "../styles/classes.js";
import { getAvatarTone } from "../utils/avatarColor.js";
import { toRelativeTime } from "../api/mappers";
import { useAuth } from "../context/useAuth";
import NotificationBell from "./NotificationBell";
import AccountSettingsModal from "./AccountSettingsModal";
import { useMemberProfile } from "../context/MemberProfileContext";

// 헤더에 아바타로 바로 보여주는 최대 인원(넘으면 "+N명")
const MAX_VISIBLE_MEMBERS = 5;

// 아바타 안쪽: 프로필 사진이 있으면 사진, 없거나 불러오지 못하면 이니셜
function HeaderAvatarContent({ member }) {
  const [failed, setFailed] = useState(false);

  if (member.profileImageUrl && !failed) {
    return <img src={member.profileImageUrl} alt="" onError={() => setFailed(true)} />;
  }

  return member.initial;
}

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
  const openMemberProfile = useMemberProfile();

  // "마지막 접속 3시간 전"이 시간이 지나면서 낡아 보이지 않게 1분마다 현재 시각을 갱신해요.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 아이콘에 마우스를 올리면 보이는 안내: 이름 + (온라인 | 마지막 접속 n시간 전 | 접속 기록 없음)
  const presenceTip = (member) => {
    const status = member.online
      ? "온라인"
      : member.lastActiveAt
        ? `마지막 접속 ${toRelativeTime(member.lastActiveAt, now)}`
        : "접속 기록 없음";
    return `${member.name ?? ""}\n${status}`;
  };

  // 온라인인 팀원이 먼저, 오프라인은 그 뒤에 보여줘요(같은 상태끼리는 원래 순서 그대로).
  const sortedMembers = useMemo(
    () => [...members.filter((m) => m.online), ...members.filter((m) => !m.online)],
    [members],
  );

  // 헤더에는 5명까지만 아바타로 보여주고 나머지는 "+N명"으로 묶어요.
  const visibleMembers = sortedMembers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembers = sortedMembers.slice(MAX_VISIBLE_MEMBERS);

  // 오른쪽 프로필은 "지금 로그인한 사람"이라서 members(워크스페이스 팀원
  // 목록)에서 찾지 않고 AuthContext의 user를 그대로 써요. members는 위의
  // 온라인 팀원 표시에만 쓰여요.
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nickname = user?.nickname ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // 메뉴가 열려 있는 동안만 바깥 클릭과 Esc를 감지해서 닫아요.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        // 키보드 사용자가 길을 잃지 않게 포커스를 트리거로 돌려줘요.
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <Icons.Search size={18} />
        <span>검색</span>
      </div>

      <div className={styles.headerRight}>
        <NotificationBell />

        <div className={styles.headerMembers}>
          <small>
            <em /> {onlineCount} / {members.length}
          </small>

          <div>
            {visibleMembers.map((member) => (
              <span
                key={member.id}
                className={`${styles.avatar} ${member.online ? styles[getAvatarTone(member.id)] : styles.offline} memberAvatarLink`}
                data-tip={presenceTip(member)}
                role="button"
                tabIndex={0}
                aria-label={`${member.name ?? "멤버"} 프로필 보기`}
                onClick={(e) => openMemberProfile(member.id, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openMemberProfile(member.id, e.currentTarget);
                  }
                }}
              >
                <HeaderAvatarContent member={member} />
              </span>
            ))}

            {/* 5명이 넘으면 나머지는 "+N명"으로 줄이고, 마우스를 올리면(키보드는 포커스) 그 멤버들이 보여요. */}
            {hiddenMembers.length > 0 && (
              <div className="headerMembersMore">
                <button type="button" className="headerMembersMore__btn" aria-haspopup="true">
                  +{hiddenMembers.length}명
                </button>

                <div className="headerMembersMore__pop">
                  <ul className="headerMembersMore__box">
                    {hiddenMembers.map((member) => (
                      <li key={member.id}>
                        <button type="button" onClick={(e) => openMemberProfile(member.id, e.currentTarget)}>
                          <span
                            className={`${styles.avatar} ${member.online ? styles[getAvatarTone(member.id)] : styles.offline}`}
                          >
                            <HeaderAvatarContent member={member} />
                          </span>
                          <span className="headerMembersMore__name">{member.name}</span>
                          <small>
                            {member.online
                              ? "온라인"
                              : member.lastActiveAt
                                ? toRelativeTime(member.lastActiveAt, now)
                                : "접속 기록 없음"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 아바타를 누르면 열리는 작은 메뉴 — 닉네임/이메일과 로그아웃.
            드롭다운 모양은 워크스페이스 전환 메뉴(.workspaceDropdown)를
            그대로 재사용하고, 오른쪽 정렬만 profileMenu로 살짝 바꿔요. */}
        <div className="profileWrap" ref={menuRef}>
          <button
            type="button"
            ref={triggerRef}
            className={`${styles.profile} profileTrigger`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <b>{nickname}</b>
            <Icons.ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="workspaceDropdown profileMenu" role="menu">
              <strong>{nickname}</strong>
              {user?.email && <p>{user.email}</p>}

              <button
                type="button"
                role="menuitem"
                className="workspaceItem"
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen(true);
                }}
              >
                <Icons.Settings size={16} />
                계정 설정
              </button>

              <button
                type="button"
                role="menuitem"
                className="workspaceItem"
                onClick={handleLogout}
              >
                <Icons.LogOut size={16} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {accountOpen && <AccountSettingsModal onClose={() => setAccountOpen(false)} />}
    </header>
  );
}
