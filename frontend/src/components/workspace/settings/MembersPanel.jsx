import { useId, useState } from "react";
import { UserPlus } from "lucide-react";

import styles from "../../../styles/classes.js";
import { getAvatarTone } from "../../../utils/avatarColor";
import { getErrorMessage } from "../../../utils/apiError";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MemberAvatar({ member }) {
  const [failed, setFailed] = useState(false);
  const showImage = member.profileImageUrl && !failed;

  return (
    <span className={`${styles.avatar} ${styles[getAvatarTone(member.id)]} wsSettings__avatar`}>
      {showImage ? (
        <img src={member.profileImageUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        member.initial
      )}
    </span>
  );
}

// 멤버 탭: 멤버 목록·이메일 초대는 누구나, 소유권 이전·추방은 소유자만 할 수 있어요(서버도 똑같이 막아요).
export default function MembersPanel({
  members,
  currentUserId,
  isOwner,
  onInvite,
  onRemove,
  onTransfer,
}) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    const target = email.trim();
    if (!EMAIL_PATTERN.test(target)) {
      setInviteMessage({ type: "error", text: "이메일 형식을 확인해주세요." });
      return;
    }

    setInviting(true);
    setInviteMessage(null);
    try {
      await onInvite(target);
      setEmail("");
      setInviteMessage({ type: "ok", text: `${target}님에게 초대를 보냈어요.` });
    } catch (err) {
      setInviteMessage({ type: "error", text: getErrorMessage(err, "초대를 보내지 못했어요.") });
    } finally {
      setInviting(false);
    }
  };

  const runAction = async (member, confirmText, action) => {
    if (!window.confirm(confirmText)) return;
    setBusyId(member.id);
    setActionError(null);
    try {
      await action(member.id);
    } catch (err) {
      setActionError(getErrorMessage(err, "처리하지 못했어요."));
    } finally {
      setBusyId(null);
    }
  };

  // 소유자가 맨 위, 그다음은 서버가 준 순서 그대로예요.
  const sorted = [...members].sort((a, b) => Number(b.role === "OWNER") - Number(a.role === "OWNER"));

  return (
    <div className="wsSettings__panel">
      <h2>멤버</h2>

      <form className="wsSettings__invite" onSubmit={handleInvite} noValidate>
        <label htmlFor={emailId}>이메일로 초대</label>
        <div className="wsSettings__inviteRow">
          <input
            id={emailId}
            type="email"
            value={email}
            placeholder="name@example.com"
            onChange={(e) => {
              setEmail(e.target.value);
              setInviteMessage(null);
            }}
          />
          <button type="submit" className="wsSettings__primary" disabled={!email.trim() || inviting}>
            <UserPlus size={15} />
            {inviting ? "보내는 중…" : "초대"}
          </button>
        </div>
        {inviteMessage && (
          <p
            className={`wsSettings__msg ${inviteMessage.type}`}
            role={inviteMessage.type === "error" ? "alert" : "status"}
          >
            {inviteMessage.text}
          </p>
        )}
      </form>

      <div className="wsSettings__memberHead">
        <span>멤버 {members.length}명</span>
      </div>

      {actionError && (
        <p className="wsSettings__msg error" role="alert">
          {actionError}
        </p>
      )}

      <ul className="wsSettings__members">
        {sorted.map((member) => {
          const isMe = member.id === currentUserId;
          const memberIsOwner = member.role === "OWNER";
          const busy = busyId === member.id;

          return (
            <li key={member.id} className="wsSettings__member">
              <MemberAvatar member={member} />

              <span className="wsSettings__memberName">
                {member.name}
                {isMe && <em>나</em>}
              </span>

              <span className={`wsSettings__role ${memberIsOwner ? "owner" : ""}`}>
                {memberIsOwner ? "소유자" : "멤버"}
              </span>

              {isOwner && !memberIsOwner && (
                <span className="wsSettings__memberActions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        member,
                        `${member.name}님에게 소유권을 넘길까요? 나는 일반 멤버가 되고, 이 작업은 새 소유자만 되돌릴 수 있어요.`,
                        onTransfer,
                      )
                    }
                  >
                    소유권 이전
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={() =>
                      runAction(member, `${member.name}님을 워크스페이스에서 내보낼까요?`, onRemove)
                    }
                  >
                    추방
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {members.length === 0 && <p className="wsSettings__hint">멤버 목록을 불러오지 못했어요.</p>}
    </div>
  );
}
