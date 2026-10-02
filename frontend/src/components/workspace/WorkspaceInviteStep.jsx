import { useId, useState } from "react";
import { ArrowLeft, Mail, Plus, X } from "lucide-react";
import { useEmailSuggest } from "../../hooks/useEmailSuggest";
import EmailSuggestList from "../common/EmailSuggestList";

export default function WorkspaceInviteStep({
  members,
  onAdd,
  onRemove,
  onPrev,
  onCreate,
  onSkip,
  submitting = false,
}) {
  const [email, setEmail] = useState("");
  // 이메일 형식/중복 검사 결과 안내 문구. 입력을 고치기 시작하면 지워요.
  const [error, setError] = useState("");
  const emailId = useId();
  const errorId = useId();
  // 이메일을 쓰는 동안 메일 주소를 추천하고, 끝까지 쓰면 그 이메일의 가입자를 보여줘요.
  const suggest = useEmailSuggest(email);

  // onAdd는 성공하면 null, 실패하면 안내 문구를 돌려줘요(검증은 부모가 목록을 알고 있어서 거기서 해요).
  const handleAdd = (override) => {
    const value = (typeof override === "string" ? override : email).trim();

    if (!value) return;

    const message = onAdd(value);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setEmail("");
  };

  // 추천을 고르면: 메일 주소 추천은 입력칸에 채우고, 가입자 카드는 바로 초대 목록에 추가해요.
  const pickSuggestion = (item) => {
    if (item.kind === "user") {
      handleAdd(item.user.email);
      return;
    }
    setEmail(item.email);
    setError("");
  };

  const handleKeyDown = (e) => {
    if (suggest.onKeyDown(e, pickSuggestion)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // 입력칸에 쓰다 만 이메일이 남아 있는데 그냥 생성하면 그 사람은 조용히 빠져요.
  // "추가"를 누른 사람만 초대되는 걸 분명히 알려주고 한 번 멈춰요.
  const handleCreate = () => {
    if (email.trim()) {
      setError("입력한 이메일을 추가(+)하거나 지운 뒤 생성해 주세요.");
      return;
    }
    onCreate();
  };

  return (
    <section className="workspace-step">
      <span className="step-label">STEP 3 / 3</span>

      <h1>팀원을 초대하세요</h1>

      <p className="step-description">
        이메일을 입력하면 워크스페이스 초대가 전송됩니다.
        <br />
        지금 하지 않아도 나중에 초대할 수 있습니다.
      </p>

      {/* 이메일 입력 */}
      <div className="workspace-field">
        <label htmlFor={emailId}>팀원 이메일</label>

        <div className="emailSuggestWrap">
          <div className="workspace-email-input">
            <Mail size={18} />

            <input
              id={emailId}
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              {...suggest.inputProps}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />

            <button
              type="button"
              onClick={() => handleAdd()}
              disabled={!email.trim()}
              aria-label="팀원 이메일 추가"
            >
              <Plus size={18} />
            </button>
          </div>

          <EmailSuggestList suggest={suggest} onPick={pickSuggestion} />
        </div>

        {error && (
          <small
            id={errorId}
            role="alert"
            style={{ display: "block", marginTop: 8, color: "#ef4444", fontSize: 13 }}
          >
            {error}
          </small>
        )}
      </div>

      {/* 초대 목록 */}
      <div className="workspace-member-list">
        {members.length === 0 ? (
          <div className="workspace-empty">아직 초대한 팀원이 없습니다.</div>
        ) : (
          members.map((member) => (
            <div className="workspace-member-chip" key={member.id}>
              <div className="member-avatar">
                {Array.from(member.name)[0]?.toUpperCase()}
              </div>

              <div className="member-info">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(member.id)}
                aria-label={`${member.email} 초대 취소`}
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 버튼 */}
      <div className="workspace-actions between">
        <button type="button" className="workspace-prev" onClick={onPrev} disabled={submitting}>
          <ArrowLeft size={18} />
          이전
        </button>

        <div className="workspace-action-group">
          {/* 건너뛰기는 목록에 누가 있든 아무도 초대하지 않고 만들어요. */}
          <button type="button" className="workspace-skip" onClick={onSkip} disabled={submitting}>
            건너뛰기
          </button>

          <button type="button" className="workspace-create" onClick={handleCreate} disabled={submitting}>
            워크스페이스 생성
          </button>
        </div>
      </div>
    </section>
  );
}
