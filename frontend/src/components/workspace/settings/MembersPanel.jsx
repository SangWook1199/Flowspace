import { useId, useState } from "react";
import { UserPlus } from "lucide-react";

import styles from "../../../styles/classes.js";
import { getAvatarTone } from "../../../utils/avatarColor";
import { getErrorMessage } from "../../../utils/apiError";
import { useEmailSuggest } from "../../../hooks/useEmailSuggest";
import EmailSuggestList from "../../common/EmailSuggestList";
import { useMemberProfile } from "../../../context/MemberProfileContext";
import useDialog from "../../../context/useDialog";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MemberAvatar({ member }) {
  const [failed, setFailed] = useState(false);
  const showImage = member.profileImageUrl && !failed;

  return (
    <span className={`${styles.avatar} ${member.online ? styles[getAvatarTone(member.id)] : styles.offline} wsSettings__avatar`}>
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
  workspaceId,
  members,
  currentUserId,
  isOwner,
  onInvite,
  onRemove,
  onTransfer,
}) {
  const { confirm } = useDialog();
  const openMemberProfile = useMemberProfile();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // 이메일을 쓰는 동안 메일 주소를 추천하고, 끝까지 쓰면 그 이메일의 가입자(이미 멤버인지·초대했는지 포함)를 보여줘요.
  const suggest = useEmailSuggest(email, { workspaceId });

  const sendInvite = async (value) => {
    const target = value.trim();
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

  const handleInvite = (e) => {
    e.preventDefault();
    sendInvite(email);
  };

  // 추천을 고르면: 메일 주소 추천은 입력칸에 채우고, 가입자 카드는 바로 초대해요.
  const pickSuggestion = (item) => {
    if (item.kind === "user") {
      sendInvite(item.user.email);
      return;
    }
    setEmail(item.email);
    setInviteMessage(null);
  };

  const runAction = async (member, confirmText, action) => {
    const ok = await confirm({ title: "멤버 관리", message: confirmText, confirmLabel: "확인", danger: true });
    if (!ok) return;
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
            onKeyDown={(e) => suggest.onKeyDown(e, pickSuggestion)}
            {...suggest.inputProps}
            autoComplete="off"
          />
          <button type="submit" className="wsSettings__primary" disabled={!email.trim() || inviting}>
            <UserPlus size={15} />
            {inviting ? "보내는 중…" : "초대"}
          </button>
        </div>
        <EmailSuggestList suggest={suggest} onPick={pickSuggestion} inline />
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
                <button
                  type="button"
                  className="wsSettings__memberLink"
                  onClick={(e) => openMemberProfile(member.id, e.currentTarget)}
                >
                  {member.name}
                </button>
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
