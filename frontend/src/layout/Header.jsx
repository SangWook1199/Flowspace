import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import styles from "../styles/classes.js";
import { getAvatarTone } from "../utils/avatarColor.js";
import { getInitial } from "../utils/initial.js";
import { useAuth } from "../context/useAuth";

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

  // 오른쪽 프로필은 "지금 로그인한 사람"이라서 members(워크스페이스 팀원
  // 목록)에서 찾지 않고 AuthContext의 user를 그대로 써요. members는 위의
  // 온라인 팀원 표시에만 쓰여요.
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nickname = user?.nickname ?? "";
  // 서버 응답 필드명이 확정되기 전이라 흔한 이름 몇 가지를 같이 받아줘요.
  const profileImage =
    user?.profileImageUrl ?? user?.profileImage ?? user?.profileUrl ?? null;

  // 이미지 주소가 깨져 있으면(만료/삭제) 빈 원이 되니까, 로드에 실패한
  // 주소를 기억해뒀다가 그땐 이니셜로 대신 보여줘요.
  const [failedImage, setFailedImage] = useState(null);
  const showImage = profileImage && failedImage !== profileImage;

  const [menuOpen, setMenuOpen] = useState(false);
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
        <button type="button" className={styles.bell} aria-label="알림">
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
            <span
              className={`${styles.avatar} ${styles[getAvatarTone(user?.userId ?? user?.id)]}`}
            >
              {showImage ? (
                <img
                  src={profileImage}
                  alt=""
                  onError={() => setFailedImage(profileImage)}
                />
              ) : (
                getInitial(nickname)
              )}
            </span>
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
                onClick={handleLogout}
              >
                <Icons.LogOut size={16} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
