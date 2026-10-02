import { forwardRef } from "react";
import { CalendarDays, Clock3, Mail } from "lucide-react";

import { toRelativeTime } from "../../api/mappers";
import { getAvatarTone } from "../../utils/avatarColor";
import { parseDateKey } from "../../utils/date";
import "../../styles/member-profile.css";

const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };

// "2026-10-05" → "10.05" (마감일 표시용). 날짜가 아니면 빈 문자열.
const formatDue = (value) => {
  const date = parseDateKey(value);
  if (!date) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

const formatJoined = (value) => {
  const date = parseDateKey(value);
  if (!date) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

// 멤버 프로필 카드. 이름·역할·접속 상태는 멤버 목록에서 바로 보여주고,
// 소개·이메일·담당 작업은 서버에서 받아오는 동안 "불러오는 중"으로 두었다가 채워요.
//  - base: 멤버 목록의 멤버(id, name, initial, role, online, lastActiveAt, profileImageUrl)
//  - profile: 서버 프로필 (아직 없으면 null), loading / error: 불러오는 상태
const MemberProfileCard = forwardRef(function MemberProfileCard(
  { base, profile, loading, error, isMe, style, onOpenTask },
  ref,
) {
  const view = { ...base, ...(profile ?? {}) };
  const online = view.online || isMe;
  const isOwner = view.role === "OWNER";

  return (
    <div
      ref={ref}
      className="memberCard"
      style={style}
      role="dialog"
      aria-label={`${view.name ?? "멤버"} 프로필`}
    >
      <div className="memberCard__head">
        <span className={`avatar memberCard__avatar ${online ? getAvatarTone(view.id) : "offline"}`}>
          {view.profileImageUrl ? <img src={view.profileImageUrl} alt="" /> : view.initial}
        </span>

        <div className="memberCard__who">
          <strong>
            {view.name}
            {isMe && <em>나</em>}
          </strong>
          <span className={`memberCard__role ${isOwner ? "owner" : ""}`}>{isOwner ? "소유자" : "멤버"}</span>
        </div>
      </div>

      {profile?.bio && <p className="memberCard__bio">{profile.bio}</p>}

      <ul className="memberCard__info">
        <li>
          <span className={`memberCard__dot ${online ? "on" : ""}`} aria-hidden="true" />
          {online
            ? "온라인"
            : view.lastActiveAt
              ? `마지막 접속 ${toRelativeTime(view.lastActiveAt)}`
              : "접속 기록 없음"}
        </li>
        {profile?.email && (
          <li>
            <Mail size={14} aria-hidden="true" />
            {profile.email}
          </li>
        )}
        {profile?.joinedAt && formatJoined(profile.joinedAt) && (
          <li>
            <CalendarDays size={14} aria-hidden="true" />
            {formatJoined(profile.joinedAt)} 참여
          </li>
        )}
      </ul>

      <div className="memberCard__tasks">
        <div className="memberCard__tasksHead">
          <span>담당 작업</span>
          {profile && (
            <small>
              진행 중 {profile.openTaskCount} · 완료 {profile.doneTaskCount}
            </small>
          )}
        </div>

        {loading && !profile && <p className="memberCard__hint">불러오는 중…</p>}
        {error && !profile && (
          <p className="memberCard__hint error" role="alert">
            {error}
          </p>
        )}

        {profile && profile.tasks.length === 0 && (
          <p className="memberCard__hint">진행 중인 담당 작업이 없어요.</p>
        )}

        {profile && profile.tasks.length > 0 && (
          <ul className="memberCard__taskList">
            {profile.tasks.map((task) => (
              <li key={task.id}>
                <button type="button" onClick={() => onOpenTask(task)}>
                  <span className={`memberCard__prio ${String(task.priority).toLowerCase()}`} title={PRIORITY_LABEL[task.priority]} />
                  <span className="memberCard__taskTitle">{task.title}</span>
                  {task.endDate && (
                    <span className="memberCard__due">
                      <Clock3 size={12} aria-hidden="true" />
                      {formatDue(task.endDate)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {profile.openTaskCount > profile.tasks.length && (
              <li className="memberCard__more">외 {profile.openTaskCount - profile.tasks.length}개</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
});

export default MemberProfileCard;
